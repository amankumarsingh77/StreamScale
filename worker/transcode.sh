#!/bin/bash

set -e

cleanup() {
    echo "Cleaning up temporary files..."
    rm -rf "${VIDEO_FILE}" "${HLS_OUTPUT_DIR}" "${THUMBNAIL_FILE}"
}

send_status_update() {
    local status="$1"
    local progress="$2"
    local duration="$3"
    local thumbnail_url="$4"
    echo "Sending status update: $status - Progress: $progress% - Duration: $duration seconds"
    aws sns publish \
        --topic-arn "${SNS_TOPIC_ARN}" \
        --message "{\"status\":\"${status}\",\"progress\":${progress},\"duration\":${duration},\"videoKey\":\"${S3_KEY}\",\"taskId\":\"${TASK_ID}\",\"thumbnailUrl\":\"${thumbnail_url}\"}" \
        --message-attributes "{\"status\":{\"DataType\":\"String\",\"StringValue\":\"${status}\"}}"
}

handle_error() {
    local error_message="$1"
    echo "Error: ${error_message}" >&2
    send_status_update "FAILED" "0"
    cleanup
    exit 1
}

trap cleanup EXIT

: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is not set}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is not set}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is not set}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is not set}"
: "${R2_ENDPOINT:?R2_ENDPOINT is not set}"
: "${R2_BUCKET:?R2_BUCKET is not set}"
: "${SNS_TOPIC_ARN:?SNS_TOPIC_ARN is not set}"
: "${TASK_ID:?TASK_ID is not set}"
: "${S3_BUCKET:?S3_BUCKET is not set}"
: "${S3_KEY:?S3_KEY is not set}"
: "${R2_CDN_ENDPOINT:?R2_CDN_ENDPOINT is not set}"

VIDEO_FILE="/tmp/${S3_KEY##*/}"
HLS_OUTPUT_DIR="/tmp/hls"
THUMBNAIL_FILE="/tmp/thumbnail.jpg"

mkdir -p "${HLS_OUTPUT_DIR}"

echo "Downloading file from S3..."
if ! aws s3 cp "s3://${S3_BUCKET}/${S3_KEY}" "${VIDEO_FILE}"; then
    handle_error "Failed to download file from S3"
fi

duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${VIDEO_FILE}")
if [ $? -ne 0 ]; then
    handle_error "Failed to get video duration"
fi

duration=$(printf "%.0f" "$duration")
# Generate thumbnail
echo "Generating thumbnail..."
if ! ffmpeg -i "${VIDEO_FILE}" -ss 00:00:10 -vframes 1 "${THUMBNAIL_FILE}"; then
    handle_error "Failed to generate thumbnail"
fi

echo "Starting transcoding process..."

ffmpeg -i "${VIDEO_FILE}" \
    -map 0:v -map 0:a -map 0:v -map 0:a \
    -filter:v:0 "scale=-2:480" -c:v:0 libx264 -preset veryfast -crf 23 -c:a:0 aac -b:a 192k \
    -filter:v:1 "scale=-2:720" -c:v:1 libx264 -preset veryfast -crf 23 -c:a:1 aac -b:a 192k \
    -hls_time 10 -hls_playlist_type vod \
    -hls_segment_filename "${HLS_OUTPUT_DIR}/segment_%v%03d.ts" \
    -start_number 0 -var_stream_map "v:0,a:0 v:1,a:1" \
    -master_pl_name master.m3u8 "${HLS_OUTPUT_DIR}/stream%v.m3u8" \
    -progress - 2>&1 | while read line; do
        current_time=$(date +%s)
        if [[ $line =~ out_time_ms=([0-9]+) ]]; then
            current_ms=${BASH_REMATCH[1]}
            progress=$(awk "BEGIN {printf \"%.0f\", ($current_ms/1000000)/$duration*100}")
            if (( current_time - last_update_time >= 30 )) || (( progress - last_progress >= 5 )); then
                send_status_update "TRANSCODING" "$progress" "$duration"
                last_update_time=$current_time
                last_progress=$progress
            fi
        fi
    done

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    handle_error "Transcoding failed"
    send_status_update "FAILED" "100" "$duration"
fi

echo "Transcoding completed."


echo "Configuring rclone..."
mkdir -p "${HOME}/.config/rclone"
cat << EOF > "${HOME}/.config/rclone/rclone.conf"
[myr2]
type = s3
provider = Cloudflare
access_key_id = ${R2_ACCESS_KEY_ID}
secret_access_key = ${R2_SECRET_ACCESS_KEY}
endpoint = ${R2_ENDPOINT}
EOF

OUTPUT_BASE_NAME=$(basename "${VIDEO_FILE%.*}")
UPLOAD_DIR=$(dirname "${S3_KEY}")

if ! rclone sync --transfers 100 "${HLS_OUTPUT_DIR}" "myr2:${R2_BUCKET}/${UPLOAD_DIR}/${OUTPUT_BASE_NAME}" --config "${HOME}/.config/rclone/rclone.conf"; then
    handle_error "Failed to upload transcoded files to R2"
fi

if ! rclone copy "${THUMBNAIL_FILE}" "myr2:${R2_BUCKET}/${UPLOAD_DIR}/${OUTPUT_BASE_NAME}" --config "${HOME}/.config/rclone/rclone.conf"; then
    handle_error "Failed to upload thumbnail to R2"
fi

send_status_update "UPDATE_THUMBNAIL" "0" "$duration" "${R2_CDN_ENDPOINT}/${UPLOAD_DIR}/${OUTPUT_BASE_NAME}/thumbnail.jpg"

echo "Deleting original video file from S3..."
if ! aws s3 rm "s3://${S3_BUCKET}/${S3_KEY}"; then
    echo "Warning: Failed to delete the original video file from S3. Please check and delete manually if needed."
fi

echo "Process completed successfully."
send_status_update "DONE" "100" "$duration"
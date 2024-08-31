#!/bin/bash

set -euo pipefail

# Function to clean up temporary files
cleanup() {
    echo "Cleaning up temporary files..."
    rm -rf "${VIDEO_FILE}" "${HLS_OUTPUT_DIR}"
}

# Function to send status updates (placeholder - implement as needed)
send_status_update() {
    local status="$1"
    echo "Sending status update: $status"
    # Implement status update logic here (e.g., using AWS SNS)
}

# Trap for cleanup on exit
trap cleanup EXIT

# Read environment variables
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is not set}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is not set}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is not set}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is not set}"
: "${R2_ENDPOINT:?R2_ENDPOINT is not set}"
: "${R2_BUCKET:?R2_BUCKET is not set}"

if [ -z "${LOCAL_TEST:-}" ]; then
    : "${S3_BUCKET:?S3_BUCKET is not set}"
    : "${S3_KEY:?S3_KEY is not set}"
    VIDEO_FILE="/tmp/${S3_KEY##*/}"
    HLS_OUTPUT_DIR="/tmp/hls"
    echo "Downloading file from S3..."
    aws s3 cp "s3://${S3_BUCKET}/${S3_KEY}" "${VIDEO_FILE}"
else
    : "${LOCAL_VIDEO_FILE:?LOCAL_VIDEO_FILE is not set}"
    : "${LOCAL_HLS_OUTPUT_DIR:?LOCAL_HLS_OUTPUT_DIR is not set}"
    VIDEO_FILE="${LOCAL_VIDEO_FILE}"
    HLS_OUTPUT_DIR="${LOCAL_HLS_OUTPUT_DIR}"
fi

mkdir -p "${HLS_OUTPUT_DIR}"
OUTPUT_BASE_NAME=$(basename "${VIDEO_FILE%.*}")
UPLOAD_DIR=$(dirname "${S3_KEY}")

echo "Starting transcoding process..."
send_status_update "TRANSCODING_STARTED"

ffmpeg -i "${VIDEO_FILE}" \
    -map 0:v -map 0:a -map 0:v -map 0:a \
    -filter:v:0 "scale=-2:480" -c:v:0 libx264 -preset veryfast -crf 23 -c:a:0 aac -b:a 192k \
    -filter:v:1 "scale=-2:720" -c:v:1 libx264 -preset veryfast -crf 23 -c:a:1 aac -b:a 192k \
    -hls_time 10 -hls_playlist_type vod \
    -hls_segment_filename "${HLS_OUTPUT_DIR}/segment_%v%03d.ts" \
    -start_number 0 -var_stream_map "v:0,a:0 v:1,a:1" \
    -master_pl_name master.m3u8 "${HLS_OUTPUT_DIR}/stream%v.m3u8"

echo "Transcoding completed."
send_status_update "TRANSCODING_COMPLETED"

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

echo "Uploading transcoded files to R2..."
rclone sync --transfers 100 "${HLS_OUTPUT_DIR}" "myr2:${R2_BUCKET}/${UPLOAD_DIR}/${OUTPUT_BASE_NAME}" --config "${HOME}/.config/rclone/rclone.conf"

echo "Upload completed."
send_status_update "UPLOAD_COMPLETED"

echo "Process completed successfully."
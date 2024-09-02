#!/bin/bash 
set -e 
 
log_message() { 
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" 
} 
 
send_status_update() {
    local status="$1"
    local message="$2"
    echo "Sending status update: $status - $message"
    
    aws sns publish \
        --region "${AWS_REGION}" \
        --topic-arn "${SNS_TOPIC_ARN}" \
        --message "{\"status\":\"${status}\",\"message\":\"${message}\",\"videoKey\":\"${S3_KEY}\",\"taskId\":\"${TASK_ID}\"}" \
        --message-attributes "{\"status\":{\"DataType\":\"String\",\"StringValue\":\"${status}\"}}"
}
 
# Check required environment variables 
required_vars=( 
    "AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY" "AWS_REGION" 
    "R2_ACCESS_KEY_ID" "R2_SECRET_ACCESS_KEY" "R2_ENDPOINT" "R2_BUCKET" 
    "SNS_TOPIC_ARN" "TASK_ID" 
) 
 
for var in "${required_vars[@]}"; do 
    if [[ -z "${!var}" ]]; then 
        echo "Error: $var is not set" 
        exit 1 
    fi 
done 
 
if [[ -z "$LOCAL_TEST" ]]; then 
    if [[ -z "$S3_BUCKET" || -z "$S3_KEY" ]]; then 
        echo "Error: S3_BUCKET and S3_KEY are required when not in local test mode" 
        exit 1 
    fi 
    VIDEO_FILE="/tmp/${S3_KEY##*/}" 
    HLS_OUTPUT_DIR="/tmp/hls" 
    echo "Downloading file from S3..." 
    if ! aws s3 cp "s3://${S3_BUCKET}/${S3_KEY}" "${VIDEO_FILE}"; then 
        echo "Error: Failed to download file from S3" 
        exit 1 
    fi 
else 
    if [[ -z "$LOCAL_VIDEO_FILE" || -z "$LOCAL_HLS_OUTPUT_DIR" ]]; then 
        echo "Error: LOCAL_VIDEO_FILE and LOCAL_HLS_OUTPUT_DIR are required in local test mode" 
        exit 1 
    fi 
    VIDEO_FILE="${LOCAL_VIDEO_FILE}" 
    HLS_OUTPUT_DIR="${LOCAL_HLS_OUTPUT_DIR}" 
fi 
 
mkdir -p "${HLS_OUTPUT_DIR}" 
OUTPUT_BASE_NAME=$(basename "${VIDEO_FILE%.*}") 
UPLOAD_DIR=$(dirname "${S3_KEY}") 
 
echo "Starting transcoding process..." 
send_status_update "TRANSCODING" "Beginning video transcoding" 
 
# Use hardware acceleration if available 
FFMPEG_HW_ARGS="" 
if [[ -e /dev/dri/renderD128 ]]; then 
    FFMPEG_HW_ARGS="-hwaccel vaapi -vaapi_device /dev/dri/renderD128" 
fi 
 
log_message "Running ffmpeg command..."
if ffmpeg $FFMPEG_HW_ARGS -i "${VIDEO_FILE}" \
    -map 0:v -map 0:a -map 0:v -map 0:a \
    -filter:v:0 "scale=-2:480" -c:v:0 libx264 -preset veryfast -crf 23 -c:a:0 aac -b:a 192k \
    -filter:v:1 "scale=-2:720" -c:v:1 libx264 -preset veryfast -crf 23 -c:a:1 aac -b:a 192k \
    -hls_time 10 -hls_playlist_type vod \
    -hls_segment_filename "${HLS_OUTPUT_DIR}/segment_%v%03d.ts" \
    -start_number 0 -var_stream_map "v:0,a:0 v:1,a:1" \
    -master_pl_name master.m3u8 "${HLS_OUTPUT_DIR}/stream%v.m3u8"
then
    log_message "Transcoding completed successfully."
    send_status_update "DONE" "Video transcoding finished"
else
    log_message "Error: Transcoding failed"
    send_status_update "FAILED" "Video transcoding failed"
    exit 1
fi
 
 
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

if ! rclone sync --transfers 100 --progress "${HLS_OUTPUT_DIR}" "myr2:${R2_BUCKET}/${UPLOAD_DIR}/${OUTPUT_BASE_NAME}" --config "${HOME}/.config/rclone/rclone.conf"; then
    echo "Error: Failed to upload files to R2"
    send_status_update "FAILED" "Failed to upload files to R2"
    exit 1
fi

echo "Process completed successfully."
send_status_update "DONE" "Video processing task completed successfully"
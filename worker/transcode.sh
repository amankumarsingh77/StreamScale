#!/bin/bash

set -e

# Read environment variables
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
R2_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY
R2_ENDPOINT=$R2_ENDPOINT
R2_BUCKET=$R2_BUCKET

if [ -z "$LOCAL_TEST" ]; then
  S3_BUCKET=${S3_BUCKET}
  S3_KEY=${S3_KEY}
  VIDEO_FILE="/tmp/${S3_KEY}"
  HLS_OUTPUT_DIR="/tmp/hls"
  aws s3 cp s3://${S3_BUCKET}/${S3_KEY} ${VIDEO_FILE}
else
  VIDEO_FILE=${LOCAL_VIDEO_FILE}
  HLS_OUTPUT_DIR=${LOCAL_HLS_OUTPUT_DIR}
fi

mkdir -p ${HLS_OUTPUT_DIR}
OUTPUT_BASE_NAME=$(basename "${VIDEO_FILE%.*}")
UPLOAD_DIR=$(dirname "${S3_KEY}")

ffmpeg -i "${VIDEO_FILE}" \
  -map 0:v -map 0:a -map 0:v -map 0:a \
  -filter:v:0 "scale=-2:480" -c:v:0 libx264 -preset veryfast -crf 23 -c:a:0 aac -b:a 192k \
  -filter:v:1 "scale=-2:720" -c:v:1 libx264 -preset veryfast -crf 23 -c:a:1 aac -b:a 192k \
  -hls_time 10 -hls_playlist_type vod \
  -hls_segment_filename "${HLS_OUTPUT_DIR}/segment_%v%03d.ts" \
  -start_number 0 -var_stream_map "v:0,a:0 v:1,a:1" \
  -master_pl_name master.m3u8 "${HLS_OUTPUT_DIR}/stream%v.m3u8"


echo "Transcoding completed."

mkdir -p /root/.config/rclone
cat <<EOF > /root/.config/rclone/rclone.conf
[myr2]
type = s3
provider = Cloudflare
access_key_id = ${R2_ACCESS_KEY_ID}
secret_access_key = ${R2_SECRET_ACCESS_KEY}
endpoint = ${R2_ENDPOINT}
EOF


rclone sync --transfers 100 ${HLS_OUTPUT_DIR} myr2:${R2_BUCKET}/${UPLOAD_DIR}/${OUTPUT_BASE_NAME} --config /root/.config/rclone/rclone.conf


rm -rf ${VIDEO_FILE} ${HLS_OUTPUT_DIR}


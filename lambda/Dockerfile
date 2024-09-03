FROM ubuntu:20.04 
 
# Install dependencies and tools in one layer 
RUN apt-get update && \ 
    apt-get install -y unzip wget ffmpeg curl file dos2unix && \ 
    rm -rf /var/lib/apt/lists/* && \ 
    # Install AWS CLI v2 
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \ 
    unzip awscliv2.zip && \ 
    ./aws/install && \ 
    rm -rf awscliv2.zip aws && \ 
    # Install rclone 
    wget https://downloads.rclone.org/rclone-current-linux-amd64.zip && \ 
    unzip rclone-current-linux-amd64.zip && \ 
    cd rclone-*-linux-amd64 && \ 
    cp rclone /usr/bin/ && \ 
    chown root:root /usr/bin/rclone && \ 
    cd .. && \ 
    rm -rf rclone-current-linux-amd64.zip rclone-*-linux-amd64 
 
# Copy the transcoding script and fix line endings 
COPY transcode.sh /usr/local/bin/transcode.sh 
RUN dos2unix /usr/local/bin/transcode.sh && \ 
    chmod +x /usr/local/bin/transcode.sh 
 
# Debugging: Check script content and permissions 
RUN ls -l /usr/local/bin/transcode.sh && \ 
    file /usr/local/bin/transcode.sh && \ 
    head -n 5 /usr/local/bin/transcode.sh 
 
# Set the working directory 
WORKDIR /app 
 
# Debugging: Print environment variables 
RUN env 
 
# Debugging: Check for required tools 
RUN which bash && \ 
    which ffmpeg && \ 
    which aws && \ 
    which rclone 
 
# Run the transcoding script 
CMD ["/bin/bash", "-c", "echo 'Starting script' && /usr/local/bin/transcode.sh"]
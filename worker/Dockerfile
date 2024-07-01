FROM ubuntu:20.04

# Install dependencies
RUN apt-get update && \
    apt-get install -y \
    unzip \
    wget \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install AWS CLI v2
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws

# Install rclone
RUN wget https://downloads.rclone.org/rclone-current-linux-amd64.zip \
    && unzip rclone-current-linux-amd64.zip \
    && cd rclone-*-linux-amd64 \
    && cp rclone /usr/bin/ \
    && chown root:root /usr/bin/rclone \
    && rm -rf rclone-current-linux-amd64.zip rclone-*-linux-amd64

# Copy the transcoding script
COPY transcode.sh /usr/local/bin/transcode.sh
RUN chmod +x /usr/local/bin/transcode.sh

# Set the working directory
WORKDIR /app

# Run the transcoding script
CMD ["/usr/local/bin/transcode.sh"]

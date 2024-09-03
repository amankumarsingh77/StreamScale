# Use Ubuntu as the base image
FROM ubuntu:20.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Set environment variables
ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8

# Install dependencies
RUN apt-get update \
    && apt-get install -y unzip wget ffmpeg curl file dos2unix \
    && rm -rf /var/lib/apt/lists/* \
    && curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws \
    && wget https://downloads.rclone.org/rclone-current-linux-amd64.zip \
    && unzip rclone-current-linux-amd64.zip \
    && cd rclone-*-linux-amd64 \
    && cp rclone /usr/bin/ \
    && chown root:root /usr/bin/rclone \
    && cd .. \
    && rm -rf rclone-current-linux-amd64.zip rclone-*-linux-amd64

# Copy the transcode script
COPY transcode.sh /usr/local/bin/transcode.sh

# Convert script to Unix format and make it executable
RUN dos2unix /usr/local/bin/transcode.sh \
    && chmod +x /usr/local/bin/transcode.sh

# Verify script permissions and content
RUN ls -l /usr/local/bin/transcode.sh \
    && file /usr/local/bin/transcode.sh \
    && head -n 5 /usr/local/bin/transcode.sh

# Set the working directory
WORKDIR /app

# Display environment variables
RUN env

# Check installed tools
RUN which bash \
    && which ffmpeg \
    && which aws \
    && which rclone

# Default command
CMD ["/bin/bash", "-c", "echo 'Starting script' && /usr/local/bin/transcode.sh"]
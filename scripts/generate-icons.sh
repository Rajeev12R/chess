#!/bin/bash

# Create icons directory if it doesn't exist
mkdir -p public/icons

# Base icon sizes needed for PWA
SIZES=(72 96 128 144 152 192 384 512)

# Check if base icon is provided
if [ ! -f "base-icon.png" ]; then
    echo "Error: base-icon.png not found!"
    echo "Please provide a base icon image (at least 512x512px) named 'base-icon.png'"
    exit 1
fi

# Generate icons for each size
for size in "${SIZES[@]}"; do
    echo "Generating ${size}x${size} icon..."
    convert base-icon.png -resize ${size}x${size} public/icons/icon-${size}x${size}.png
done

# Generate badge icon
convert base-icon.png -resize 72x72 public/icons/badge-72x72.png

echo "Icon generation complete!" 
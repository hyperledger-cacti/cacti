#!/bin/bash

# Navigate to the specified directory
cd /CSDE-cordapp-template-kotlin/

# Check if the directory change was successful
if [ $? -eq 0 ]; then
  # Run the gradlew command
  ./gradlew 3-buildCpis
else
  echo "Failed to change directory to /CSDE-cordapp-template-kotlin/"
fi

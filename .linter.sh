#!/bin/bash
cd /home/kavia/workspace/code-generation/notemaster-94443-81a5d8c8/notes_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi


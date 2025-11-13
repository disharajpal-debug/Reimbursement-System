#!/bin/bash
# Employee Dashboard - Quick Start Script
# This script starts both backend and frontend servers

echo "=================================="
echo "Employee Dashboard - Quick Start"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo -e "${BLUE}Starting Reimbursement System...${NC}"
echo ""

# Start backend server
echo -e "${GREEN}1. Starting Backend Server (Port 5000)${NC}"
cd "$(dirname "$0")/reimbursement-portal-server"
node server.js &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 3

# Start frontend development server
echo ""
echo -e "${GREEN}2. Starting Frontend (Port 3000)${NC}"
cd "$(dirname "$0")/reimbursement-portal-client"
npm start &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo -e "${BLUE}=================================="
echo "Services Started Successfully!"
echo "=================================="
echo ""
echo "Backend:  http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo ""
echo "To stop, press Ctrl+C in this terminal"
echo -e "${NC}"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

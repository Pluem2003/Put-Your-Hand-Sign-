class PlayerClient {
    constructor(playerId) {
        this.playerId = playerId;
        this.playerNum = playerId.replace('player', '');
        this.isReady = false;
        this.modalShown = false;
        
        // Performance Tracking
        this.frameTimes = [];
        this.currentFps = 0;
        this.showFps = false;
        this.showInference = false;
        this.currentInference = 0;
        
        // UI Elements
        this.videoElement = document.getElementById('cameraVideo');
        this.canvasElement = document.getElementById('cameraCanvas');
        this.readyButton = document.getElementById('readyButton');
        this.statusMessage = document.getElementById('statusMessage');
        
        this.fpsToggle = document.getElementById('fpsToggle');
        this.fpsDisplay = document.getElementById('fpsDisplay');
        this.inferenceToggle = document.getElementById('inferenceToggle');
        this.inferenceDisplay = document.getElementById('inferenceDisplay');
        
        // Camera Settings
        this.cameraIndexInput = document.getElementById('cameraIndexInput');
        this.setCameraButton = document.getElementById('setCameraButton');
        this.openNativeSettingsBtn = document.getElementById('openNativeSettingsBtn');
        
        // Camera Controls
        this.brightnessSlider = document.getElementById('brightnessSlider');
        this.contrastSlider = document.getElementById('contrastSlider');
        this.exposureSlider = document.getElementById('exposureSlider');
        this.brightnessValue = document.getElementById('brightnessValue');
        this.contrastValue = document.getElementById('contrastValue');
        this.exposureValue = document.getElementById('exposureValue');
        
        // Modal Elements
        this.resultModal = document.getElementById('resultModal');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalIcon = document.getElementById('modalIcon');
        this.modalMessage = document.getElementById('modalMessage');
        this.modalFinalScore = document.getElementById('modalFinalScore');
        
        this.displayImage = new Image();
        this.displayImage.onload = () => {
            if (!this.canvasElement) return;
            const ctx = this.canvasElement.getContext('2d');
            this.canvasElement.width = this.displayImage.width;
            this.canvasElement.height = this.displayImage.height;
            ctx.drawImage(this.displayImage, 0, 0);
            if (this.videoElement) this.videoElement.style.display = 'none';
            this.canvasElement.style.display = 'block';
        };
        
        this.setupEventListeners();
        this.setupSocket();
        this.startPerformanceTracker();
    }

    setupSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.showStatus('Connected to server', 'success');
        });

        this.socket.on('gameState', (state) => {
            this.handleGameState(state);
        });

        this.socket.on('playerPoseUpdate', (data) => {
            if (data.playerNum == this.playerNum) {
                this.updateLocalPose(data);
            }
        });

        this.socket.on('camera_changed', (data) => {
            if (data.playerId === this.playerId) {
                if (data.success) {
                    this.showStatus(`Camera successfully changed to index ${data.cameraIndex}`, 'success');
                } else {
                    this.showStatus(`Failed to change camera: ${data.error}`, 'error');
                }
            }
        });

        this.socket.on('disconnect', () => {
            this.showStatus('Disconnected from server', 'error');
        });
    }

    setupEventListeners() {
        this.readyButton.addEventListener('click', () => this.toggleReady());
        
        if (this.fpsToggle) {
            this.fpsToggle.addEventListener('change', (e) => {
                this.showFps = e.target.checked;
                this.fpsDisplay.style.display = this.showFps ? 'inline' : 'none';
            });
        }

        if (this.inferenceToggle) {
            this.inferenceToggle.addEventListener('change', (e) => {
                this.showInference = e.target.checked;
                this.inferenceDisplay.style.display = this.showInference ? 'inline' : 'none';
            });
        }

        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => {
                this.resultModal.style.display = 'none';
            });
        }

        if (this.setCameraButton) {
            this.setCameraButton.addEventListener('click', () => {
                const index = parseInt(this.cameraIndexInput.value);
                if (isNaN(index)) return;
                
                this.showStatus(`Requesting camera change to index ${index}...`, 'info');
                this.socket.emit('set_camera', {
                    playerId: this.playerId,
                    cameraIndex: index
                });
            });
        }

        if (this.openNativeSettingsBtn) {
            this.openNativeSettingsBtn.addEventListener('click', () => {
                this.socket.emit('open_camera_settings', {
                    playerId: this.playerId
                });
            });
        }

        const updateControl = (type, value) => {
            if (this[`${type}Value`]) this[`${type}Value`].textContent = value;
            this.socket.emit('update_camera_controls', {
                playerId: this.playerId,
                type: type,
                value: parseFloat(value)
            });
        };

        if (this.brightnessSlider) {
            this.brightnessSlider.addEventListener('input', (e) => updateControl('brightness', e.target.value));
        }
        if (this.contrastSlider) {
            this.contrastSlider.addEventListener('input', (e) => updateControl('contrast', e.target.value));
        }
        if (this.exposureSlider) {
            this.exposureSlider.addEventListener('input', (e) => updateControl('exposure', e.target.value));
        }
    }

    startPerformanceTracker() {
        setInterval(() => {
            const now = Date.now();
            // Keep only frames from the last 1 second
            this.frameTimes = this.frameTimes.filter(t => now - t < 1000);
            this.currentFps = this.frameTimes.length;

            if (this.fpsDisplay) {
                this.fpsDisplay.textContent = `FPS: ${this.currentFps}`;
            }

            if (this.inferenceDisplay) this.inferenceDisplay.textContent = `AI: ${this.currentInference.toFixed(1)}ms`;
        }, 500);
    }

    toggleReady() {
        const nicknameInput = document.getElementById('nicknameInput');
        const nickname = nicknameInput ? nicknameInput.value.trim() : '';
        
        if (!this.isReady && nickname === '') {
            this.showStatus('Please enter a nickname first!', 'error');
            return;
        }

        this.isReady = !this.isReady;
        
        if (nicknameInput) {
            nicknameInput.disabled = this.isReady;
        }

        this.socket.emit('player_ready', { 
            playerId: this.playerId, 
            ready: this.isReady,
            nickname: nickname
        });
        this.updateReadyButtonUI();
    }

    updateReadyButtonUI() {
        if (this.isReady) {
            this.readyButton.textContent = 'Unready';
            this.readyButton.classList.add('active');
            this.showStatus('Ready! Waiting for other player...', 'success');
        } else {
            this.readyButton.textContent = 'Ready To Play';
            this.readyButton.classList.remove('active');
            this.showStatus('Not ready', 'error');
        }
    }

    handleGameState(state) {
        const playerState = state[this.playerId];
        
        // Sync ready state
        if (!state.gameActive && state.countdown === 0) {
            if (this.isReady !== playerState.ready) {
                this.isReady = playerState.ready;
                this.updateReadyButtonUI();
            }
        }

        document.getElementById('playerScore').textContent = playerState.score;
        this.currentInference = playerState.inferenceTime || 0;

        if (state.timerRunning) {
            const minutes = Math.floor(state.timer / 60);
            const seconds = state.timer % 60;
            document.getElementById('playerTimer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else {
            document.getElementById('playerTimer').textContent = (state.timer === 0 && state.roundComplete) ? 'Done' : '-';
        }

        const prediction = playerState.prediction;
        document.getElementById('playerPrediction').textContent = prediction ? 
            `${prediction} (${(playerState.poseConfidence * 100).toFixed(0)}%)` : 'Waiting...';

        // Update frame if available in full state
        if (playerState.cameraFrame) {
            this.updateFrame(playerState.cameraFrame);
        }

        if (state.countdown > 0) {
            this.showStatus(`Starting in ${state.countdown}...`, 'warning');
            this.readyButton.style.display = 'none';
            this.modalShown = false; 
        } else if (state.gameActive) {
            this.readyButton.style.display = 'none';
            this.modalShown = false; 
            if (state.currentTask) document.getElementById('currentTask').textContent = state.currentTask.name;

            if (state.roundWinner) {
                if (state.roundWinner === this.playerId) this.showStatus('You got it! +1', 'success');
                else this.showStatus(`${state.roundWinner === 'player1' ? 'Player 1' : 'Player 2'} got it!`, 'error');
            } else {
                this.showStatus('Perform the pose!', 'info');
            }
        } else {
            this.readyButton.style.display = 'block';
            if (state.roundComplete) {
                if (!this.modalShown && state.winner) {
                    this.showResultModal(state.winner, playerState.score);
                    this.modalShown = true;
                }
                if (state.winner === 'tie') this.showStatus('Game Over: It\'s a tie!', 'warning');
                else if (state.winner === this.playerId) this.showStatus('🎉 Game Over: YOU WON! 🎉', 'success');
                else this.showStatus('Game Over: Opponent won', 'error');
            } else {
                document.getElementById('currentTask').textContent = 'Waiting for game start...';
            }
        }
    }

    updateLocalPose(data) {
        this.currentInference = data.inferenceTime || 0;
        document.getElementById('playerPrediction').textContent = data.prediction ? 
            `${data.prediction} (${(data.confidence * 100).toFixed(0)}%)` : 'Waiting...';
        
        if (data.cameraFrame) {
            this.updateFrame(data.cameraFrame);
        }
        
        if (data.score !== undefined) {
            document.getElementById('playerScore').textContent = data.score;
        }
    }

    updateFrame(frameData) {
        if (!frameData) return;
        this.frameTimes.push(Date.now());

        // Check if frameData is binary (ArrayBuffer or Blob) or string (Base64)
        if (typeof frameData !== 'string') {
            const blob = new Blob([frameData], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            if (this.displayImage.src && this.displayImage.src.startsWith('blob:')) {
                URL.revokeObjectURL(this.displayImage.src);
            }
            this.displayImage.src = url;
        } else {
            const prefix = frameData.startsWith('data:image') ? '' : 'data:image/jpeg;base64,';
            this.displayImage.src = prefix + frameData;
        }
        
        document.getElementById('cameraStatus').textContent = 'AI Feed: Live';
    }

    showResultModal(winner, finalScore) {
        if (!this.resultModal) return;
        this.modalFinalScore.textContent = finalScore;
        if (winner === 'tie') {
            this.modalIcon.textContent = '🤝';
            this.modalTitle.textContent = "It's a Tie!";
            this.modalMessage.textContent = "Great match! Both players were equally skilled.";
        } else if (winner === this.playerId) {
            this.modalIcon.textContent = '🏆';
            this.modalTitle.textContent = "You Won!";
            this.modalMessage.textContent = "Incredible performance! You're the hand sign master.";
        } else {
            this.modalIcon.textContent = '💔';
            this.modalTitle.textContent = "You Lost";
            this.modalMessage.textContent = "Nice try! Better luck in the next round.";
        }
        this.resultModal.style.display = 'flex';
    }

    showStatus(message, type) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
    }
}

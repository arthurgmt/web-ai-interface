class ImageGenerator {
    constructor() {
        this.apiKey = '';
        this.apiUrl = 'https://api.openai.com/v1/images/generations';
        this.accessCode = 'VOTRE_CODE_SECRET'; // Changez ceci !
        this.isConfigured = false;
        
        this.initializeElements();
        this.bindEvents();
        this.checkApiStatus();
        this.loadSavedConfig();
    }

    initializeElements() {
        this.promptInput = document.getElementById('prompt');
        this.styleSelect = document.getElementById('style');
        this.sizeSelect = document.getElementById('size');
        this.generateBtn = document.getElementById('generate-btn');
        this.btnText = document.getElementById('btn-text');
        this.loading = document.getElementById('loading');
        this.imageContainer = document.getElementById('image-container');
        this.generatedImage = document.getElementById('generated-image');
        this.downloadBtn = document.getElementById('download-btn');
        this.newGenerationBtn = document.getElementById('new-generation');
        this.errorMessage = document.getElementById('error-message');
        this.apiStatus = document.getElementById('api-status');
        
        // Éléments du modal
        this.configModal = document.getElementById('config-modal');
        this.configBtn = document.getElementById('config-btn');
        this.configForm = document.getElementById('config-form');
        this.cancelConfigBtn = document.getElementById('cancel-config');
        this.apiKeyInput = document.getElementById('api-key');
        this.accessCodeInput = document.getElementById('access-code');
    }

    bindEvents() {
        this.generateBtn.addEventListener('click', () => this.generateImage());
        this.downloadBtn.addEventListener('click', () => this.downloadImage());
        this.newGenerationBtn.addEventListener('click', () => this.resetInterface());
        this.promptInput.addEventListener('input', () => this.validateInput());
        
        // Événements du modal
        this.configBtn.addEventListener('click', () => this.showConfigModal());
        this.cancelConfigBtn.addEventListener('click', () => this.hideConfigModal());
        this.configForm.addEventListener('submit', (e) => this.handleConfigSubmit(e));
        
        // Fermer le modal en cliquant à l'extérieur
        this.configModal.addEventListener('click', (e) => {
            if (e.target === this.configModal) {
                this.hideConfigModal();
            }
        });
    }

    showConfigModal() {
        this.configModal.style.display = 'block';
        this.apiKeyInput.focus();
    }

    hideConfigModal() {
        this.configModal.style.display = 'none';
        this.configForm.reset();
    }

    handleConfigSubmit(e) {
        e.preventDefault();
        
        const apiKey = this.apiKeyInput.value.trim();
        const enteredCode = this.accessCodeInput.value.trim();
        
        // Vérification du code d'accès
        if (enteredCode !== this.accessCode) {
            this.showError('Code d\'accès incorrect !');
            return;
        }
        
        // Validation basique de la clé API OpenAI
        if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
            this.showError('Format de clé API invalide');
            return;
        }
        
        // Configuration réussie
        this.apiKey = apiKey;
        this.isConfigured = true;
        this.saveConfig();
        this.checkApiStatus();
        this.hideConfigModal();
        this.hideError();
        
        alert('✅ Configuration réussie ! Vous pouvez maintenant générer des images.');
    }

    saveConfig() {
        // Sauvegarde temporaire dans le sessionStorage (disparaît à la fermeture)
        // Plus sécurisé que localStorage
        if (this.apiKey) {
            sessionStorage.setItem('temp_api_configured', 'true');
            // On ne sauvegarde pas la vraie clé, juste un token temporaire
            sessionStorage.setItem('temp_api_token', btoa(this.apiKey));
        }
    }

    loadSavedConfig() {
        const isConfigured = sessionStorage.getItem('temp_api_configured');
        const tempToken = sessionStorage.getItem('temp_api_token');
        
        if (isConfigured && tempToken) {
            try {
                this.apiKey = atob(tempToken);
                this.isConfigured = true;
                this.checkApiStatus();
            } catch (e) {
                // Token corrompu, on efface
                this.clearSavedConfig();
            }
        }
    }

    clearSavedConfig() {
        sessionStorage.removeItem('temp_api_configured');
        sessionStorage.removeItem('temp_api_token');
        this.apiKey = '';
        this.isConfigured = false;
        this.checkApiStatus();
    }

    validateInput() {
        const hasPrompt = this.promptInput.value.trim().length > 0;
        const isReady = hasPrompt && this.isConfigured;
        this.generateBtn.disabled = !isReady;
    }

    checkApiStatus() {
        if (!this.isConfigured) {
            this.apiStatus.textContent = 'Non configurée';
            this.apiStatus.style.color = '#e53e3e';
            this.generateBtn.disabled = true;
        } else {
            this.apiStatus.textContent = 'Configurée ✅';
            this.apiStatus.style.color = '#38a169';
            this.validateInput();
        }
    }

    async generateImage() {
        if (!this.isConfigured) {
            this.showConfigModal();
            return;
        }

        const prompt = this.promptInput.value.trim();
        if (!prompt) return;

        this.setLoading(true);
        this.hideError();

        try {
            const imageUrl = await this.callOpenAIAPI(prompt);
            this.displayImage(imageUrl);
        } catch (error) {
            this.showError('Erreur lors de la génération: ' + error.message);
            
            // Si erreur d'auth, on propose de reconfigurer
            if (error.message.includes('401') || error.message.includes('authentication')) {
                this.clearSavedConfig();
                setTimeout(() => this.showConfigModal(), 2000);
            }
        } finally {
            this.setLoading(false);
        }
    }

    async callOpenAIAPI(prompt) {
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: "dall-e-3", // ou "dall-e-2" pour moins cher
                prompt: this.buildPrompt(prompt),
                n: 1,
                size: this.sizeSelect.value || "1024x1024"
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Erreur API: ${response.status}`);
        }

        const data = await response.json();
        return data.data[0].url;
    }

    buildPrompt(userPrompt) {
        const style = this.styleSelect.value;
        let fullPrompt = userPrompt;
        
        if (style) {
            const stylePrompts = {
                'realistic': ', photorealistic, high quality, detailed',
                'cartoon': ', cartoon style, animated, colorful',
                'artistic': ', artistic, painted, creative',
                'digital-art': ', digital art, modern, stylized'
            };
            fullPrompt += stylePrompts[style] || '';
        }
        
        return fullPrompt;
    }

    displayImage(imageUrl) {
        this.generatedImage.src = imageUrl;
        this.imageContainer.classList.remove('hidden');
        this.generatedImage.onload = () => {
            this.imageContainer.scrollIntoView({ behavior: 'smooth' });
        };
    }

    downloadImage() {
        const link = document.createElement('a');
        link.download = `generated-image-${Date.now()}.png`;
        link.href = this.generatedImage.src;
        link.click();
    }

    resetInterface() {
        this.imageContainer.classList.add('hidden');
        this.promptInput.focus();
    }

    setLoading(isLoading) {
        if (isLoading) {
            this.btnText.classList.add('hidden');
            this.loading.classList.remove('hidden');
            this.generateBtn.disabled = true;
        } else {
            this.btnText.classList.remove('hidden');
            this.loading.classList.add('hidden');
            this.validateInput();
        }
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
        this.errorMessage.scrollIntoView({ behavior: 'smooth' });
    }

    hideError() {
        this.errorMessage.classList.add('hidden');
    }
}

// Initialisation
const generator = new ImageGenerator();
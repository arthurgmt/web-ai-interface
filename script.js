// Variables globales
let apiKey = '';
let currentImageUrl = '';

// Éléments DOM
const authModal = document.getElementById('authModal');
const mainInterface = document.getElementById('mainInterface');
const apiKeyInput = document.getElementById('apiKeyInput');
const submitApiKeyBtn = document.getElementById('submitApiKey');
const changeApiKeyBtn = document.getElementById('changeApiKey');
const promptInput = document.getElementById('promptInput');
const generateBtn = document.getElementById('generateBtn');
const chatMessages = document.getElementById('chatMessages');
const imageContainer = document.getElementById('imageContainer');
const downloadBtn = document.getElementById('downloadBtn');
const modelSelect = document.getElementById('modelSelect');
const styleSelect = document.getElementById('styleSelect');
const sizeSelect = document.getElementById('sizeSelect');
const qualitySelect = document.getElementById('qualitySelect');
const sizeGroup = document.getElementById('sizeGroup');
const qualityGroup = document.getElementById('qualityGroup');

// Gestion de l'authentification
submitApiKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key && key.startsWith('sk-')) {
        apiKey = key;
        authModal.classList.remove('active');
        mainInterface.classList.add('active');
        apiKeyInput.value = '';
        
        // Sauvegarder dans le sessionStorage (pas localStorage pour la sécurité)
        sessionStorage.setItem('openai_api_key', apiKey);
    } else {
        alert('Veuillez entrer une clé API valide (commence par "sk-")');
    }
});

// Permettre de valider avec Enter
apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitApiKeyBtn.click();
    }
});

// Changer la clé API
changeApiKeyBtn.addEventListener('click', () => {
    if (confirm('Voulez-vous vraiment changer la clé API ?')) {
        apiKey = '';
        sessionStorage.removeItem('openai_api_key');
        authModal.classList.add('active');
        mainInterface.classList.remove('active');
    }
});

// Vérifier si une clé est déjà stockée
window.addEventListener('load', () => {
    const storedKey = sessionStorage.getItem('openai_api_key');
    if (storedKey) {
        apiKey = storedKey;
        authModal.classList.remove('active');
        mainInterface.classList.add('active');
    }
});

// Gestion du modèle
modelSelect.addEventListener('change', () => {
    const model = modelSelect.value;
    if (model === 'dall-e-2') {
        // DALL-E 2 a des tailles différentes
        sizeSelect.innerHTML = `
            <option value="256x256">Petit (256x256)</option>
            <option value="512x512">Moyen (512x512)</option>
            <option value="1024x1024">Grand (1024x1024)</option>
        `;
        qualityGroup.style.display = 'none';
    } else {
        // DALL-E 3
        sizeSelect.innerHTML = `
            <option value="1024x1024">Carré (1024x1024)</option>
            <option value="1792x1024">Paysage (1792x1024)</option>
            <option value="1024x1792">Portrait (1024x1792)</option>
        `;
        qualityGroup.style.display = 'block';
    }
});

// Génération d'image
generateBtn.addEventListener('click', generateImage);
promptInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        generateImage();
    }
});

async function generateImage() {
    const prompt = promptInput.value.trim();
    if (!prompt) {
        alert('Veuillez entrer une description');
        return;
    }

    // Ajouter le message de l'utilisateur
    addMessage(prompt, 'user');
    promptInput.value = '';

    // Construire le prompt enrichi
    let enrichedPrompt = prompt;
    const selectedStyle = styleSelect.value;
    if (selectedStyle) {
        enrichedPrompt = `${prompt}, ${selectedStyle} style`;
    }

    // Ajouter les préfixes
    const prefixes = [];
    if (document.getElementById('highQualityCheck').checked) {
        prefixes.push('high quality');
    }
    if (document.getElementById('detailedCheck').checked) {
        prefixes.push('highly detailed');
    }
    if (document.getElementById('cinematicCheck').checked) {
        prefixes.push('cinematic lighting');
    }
    if (document.getElementById('8kCheck').checked) {
        prefixes.push('8k resolution');
    }

    if (prefixes.length > 0) {
        enrichedPrompt = `${enrichedPrompt}, ${prefixes.join(', ')}`;
    }

    // Désactiver le bouton et afficher le spinner
    generateBtn.disabled = true;
    generateBtn.classList.add('loading');
    imageContainer.innerHTML = '<div class="placeholder"><p>Génération en cours...</p></div>';

    try {
        const model = modelSelect.value;
        const requestBody = {
            model: model,
            prompt: enrichedPrompt,
            n: 1,
            size: sizeSelect.value
        };

        // Ajouter la qualité pour DALL-E 3
        if (model === 'dall-e-3') {
            requestBody.quality = qualitySelect.value;
        }

        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Erreur lors de la génération');
        }

        const data = await response.json();
        const imageUrl = data.data[0].url;
        currentImageUrl = imageUrl;

        // Afficher l'image
        displayImage(imageUrl);
        
        // Ajouter un message de succès
        addMessage(`Image générée avec succès ! J'ai utilisé le prompt enrichi : "${enrichedPrompt}"`, 'assistant');

        // Activer le bouton de téléchargement
        downloadBtn.disabled = false;

    } catch (error) {
        console.error('Erreur:', error);
        addMessage(`Désolé, une erreur s'est produite : ${error.message}`, 'assistant');
        imageContainer.innerHTML = '<div class="placeholder"><p>Erreur lors de la génération</p></div>';
    } finally {
        generateBtn.disabled = false;
        generateBtn.classList.remove('loading');
    }
}

// Afficher l'image
function displayImage(url) {
    const img = document.createElement('img');
    img.src = url;
    img.className = 'generated-image';
    img.alt = 'Image générée';
    
    imageContainer.innerHTML = '';
    imageContainer.appendChild(img);
}

// Ajouter un message au chat
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.innerHTML = `<p>${text}</p>`;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Télécharger l'image
downloadBtn.addEventListener('click', async () => {
    if (!currentImageUrl) return;

    try {
        // Créer un nom de fichier unique
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `ai-image-${timestamp}.png`;

        // Télécharger l'image
        const response = await fetch(currentImageUrl);
        const blob = await response.blob();
        
        // Créer un lien de téléchargement
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);

        addMessage(`Image téléchargée sous le nom : ${filename}`, 'assistant');
    } catch (error) {
        console.error('Erreur lors du téléchargement:', error);
        addMessage('Erreur lors du téléchargement de l\'image', 'assistant');
    }
});

// Raccourcis clavier
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter pour générer
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.activeElement === promptInput && !generateBtn.disabled) {
            generateImage();
        }
    }
    
    // Ctrl/Cmd + S pour télécharger
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && currentImageUrl) {
        e.preventDefault();
        downloadBtn.click();
    }
});

// Gestion du redimensionnement de la textarea
promptInput.addEventListener('input', () => {
    promptInput.style.height = 'auto';
    promptInput.style.height = Math.min(promptInput.scrollHeight, 150) + 'px';
});

// Exemples de prompts
const examplePrompts = [
    "Un château médiéval flottant dans les nuages au coucher du soleil",
    "Un astronaute jouant de la guitare sur Mars",
    "Une forêt bioluminescente avec des créatures fantastiques",
    "Un café steampunk dans une ville futuriste",
    "Un dragon de cristal survolant une cascade arc-en-ciel"
];

// Ajouter un bouton d'exemple aléatoire
const chatHeader = document.querySelector('.chat-header');
const exampleBtn = document.createElement('button');
exampleBtn.className = 'btn btn-secondary';
exampleBtn.textContent = '💡 Exemple';
exampleBtn.style.fontSize = '0.875rem';
exampleBtn.style.padding = '0.5rem 1rem';
exampleBtn.addEventListener('click', () => {
    const randomPrompt = examplePrompts[Math.floor(Math.random() * examplePrompts.length)];
    promptInput.value = randomPrompt;
    promptInput.focus();
    promptInput.dispatchEvent(new Event('input'));
});

chatHeader.style.display = 'flex';
chatHeader.style.justifyContent = 'space-between';
chatHeader.style.alignItems = 'center';
chatHeader.appendChild(exampleBtn);

// Animation de typing pour les messages
function typeMessage(text, element, callback) {
    let index = 0;
    const speed = 30;
    
    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(type, speed);
        } else if (callback) {
            callback();
        }
    }
    
    type();
}

// Historique des prompts
const promptHistory = [];
let historyIndex = -1;

promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex < promptHistory.length - 1) {
            historyIndex++;
            promptInput.value = promptHistory[promptHistory.length - 1 - historyIndex];
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex > 0) {
            historyIndex--;
            promptInput.value = promptHistory[promptHistory.length - 1 - historyIndex];
        } else if (historyIndex === 0) {
            historyIndex = -1;
            promptInput.value = '';
        }
    }
});

// Modifier la fonction generateImage pour sauvegarder l'historique
const originalGenerateImage = generateImage;
generateImage = async function() {
    const prompt = promptInput.value.trim();
    if (prompt && !promptHistory.includes(prompt)) {
        promptHistory.push(prompt);
        if (promptHistory.length > 50) {
            promptHistory.shift();
        }
    }
    historyIndex = -1;
    return originalGenerateImage();
};

// Gestion du glisser-déposer pour les images de référence
imageContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageContainer.classList.add('drag-over');
});

imageContainer.addEventListener('dragleave', () => {
    imageContainer.classList.remove('drag-over');
});

imageContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    imageContainer.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            displayImage(event.target.result);
            addMessage("Image de référence chargée. Vous pouvez maintenant décrire les modifications souhaitées.", 'assistant');
        };
        reader.readAsDataURL(files[0]);
    }
});

// Ajouter les styles pour le drag-over
const style = document.createElement('style');
style.textContent = `
    .image-container.drag-over {
        border: 2px dashed var(--primary-color);
        background-color: rgba(99, 102, 241, 0.1);
    }
`;
document.head.appendChild(style);

// Fonction pour copier l'image dans le presse-papier
async function copyImageToClipboard() {
    if (!currentImageUrl) return;
    
    try {
        const response = await fetch(currentImageUrl);
        const blob = await response.blob();
        
        await navigator.clipboard.write([
            new ClipboardItem({
                [blob.type]: blob
            })
        ]);
        
        addMessage("Image copiée dans le presse-papier !", 'assistant');
    } catch (error) {
        console.error('Erreur lors de la copie:', error);
        addMessage("Impossible de copier l'image dans le presse-papier", 'assistant');
    }
}

// Ajouter un bouton de copie
const copyBtn = document.createElement('button');
copyBtn.id = 'copyBtn';
copyBtn.className = 'btn btn-secondary';
copyBtn.disabled = true;
copyBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
    Copier
`;
copyBtn.addEventListener('click', copyImageToClipboard);

// Insérer le bouton de copie après le bouton de téléchargement
downloadBtn.parentNode.insertBefore(copyBtn, downloadBtn.nextSibling);

// Activer/désactiver le bouton de copie avec le bouton de téléchargement
const originalDownloadBtnSetter = Object.getOwnPropertyDescriptor(HTMLButtonElement.prototype, 'disabled').set;
Object.defineProperty(downloadBtn, 'disabled', {
    set: function(value) {
        originalDownloadBtnSetter.call(this, value);
        copyBtn.disabled = value;
    },
    get: function() {
        return this.getAttribute('disabled') !== null;
    }
});

// Message de bienvenue amélioré
window.addEventListener('load', () => {
    if (mainInterface.classList.contains('active')) {
        setTimeout(() => {
            addMessage("Bienvenue ! Je suis prêt à générer des images selon vos descriptions. N'hésitez pas à être créatif et détaillé ! 🎨", 'assistant');
        }, 500);
    }
});

// Sauvegarde automatique du prompt en cours
let autosaveTimeout;
promptInput.addEventListener('input', () => {
    clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout(() => {
        sessionStorage.setItem('current_prompt', promptInput.value);
    }, 1000);
});

// Restaurer le prompt sauvegardé
window.addEventListener('load', () => {
    const savedPrompt = sessionStorage.getItem('current_prompt');
    if (savedPrompt) {
        promptInput.value = savedPrompt;
        promptInput.dispatchEvent(new Event('input'));
    }
});

// Nettoyer la sauvegarde après génération
const clearAutosave = () => {
    sessionStorage.removeItem('current_prompt');
};

generateBtn.addEventListener('click', clearAutosave);

console.log('Interface de génération d\'images chargée avec succès!');
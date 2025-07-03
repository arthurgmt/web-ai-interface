let API_KEY = '';
let currentImageUrl = '';
let uploadedImageDescription = '';

function authenticate() {
    const key = document.getElementById('apiKey').value;
    if (key && key.startsWith('sk-')) {
        API_KEY = key;
        document.getElementById('authModal').classList.remove('active');
        document.getElementById('app').classList.add('active');
    } else {
        alert('Clé API invalide');
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('uploadPreview');
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Image de référence">
                <p>Image chargée ! Décrivez la personne/animal dans votre prompt<br>
                (ex: "un homme brun avec des lunettes" ou "un chat tigré")</p>
            `;
            
            // Ajouter une note dans le textarea si vide
            const promptField = document.getElementById('prompt');
            if (!promptField.value) {
                promptField.placeholder = 'Décrivez la personne/animal de la photo et la scène souhaitée...';
            }
        };
        reader.readAsDataURL(file);
    }
}

async function generateImage() {
    const prompt = document.getElementById('prompt').value;
    const style = document.getElementById('style').value;
    const size = document.getElementById('size').value;
    
    if (!prompt) {
        alert('Entrez une description (incluez la description de la personne/animal si vous avez uploadé une image)');
        return;
    }
    
    const button = document.getElementById('generate');
    button.disabled = true;
    button.textContent = 'Génération...';
    
    let fullPrompt = prompt;
    if (style) {
        fullPrompt += ', ' + style + ' style';
    }
    
    // Ajouter des instructions pour que DALL-E comprenne mieux
    if (document.getElementById('uploadPreview').innerHTML) {
        fullPrompt += ', detailed, maintaining facial features and characteristics';
    }
    
    try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: fullPrompt,
                n: 1,
                size: size
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }
        
        currentImageUrl = data.data[0].url;
        
        document.getElementById('imageContainer').innerHTML = 
            `<img src="${currentImageUrl}" alt="Generated image">`;
        
        document.getElementById('download').style.display = 'block';
        
    } catch (error) {
        alert('Erreur: ' + error.message);
    } finally {
        button.disabled = false;
        button.textContent = 'Générer';
    }
}

async function downloadImage() {
    if (!currentImageUrl) return;
    
    const response = await fetch(currentImageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'image-' + Date.now() + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

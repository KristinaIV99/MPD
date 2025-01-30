export class WordPopup {
    constructor() {
        this.popup = this.createPopupElement();
        document.body.appendChild(this.popup);
        this.bindEvents();
    }

    createPopupElement() {
        const popup = document.createElement('div');
        popup.className = 'word-popup';
        popup.style.display = 'none';
        return popup;
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('interactive-word')) {
                this.showPopup(e.target);
            } else {
                this.hidePopup();
            }
        });
    }

    showPopup(wordElement) {
        const translation = wordElement.dataset.translation;
        const rect = wordElement.getBoundingClientRect();
        
        this.popup.textContent = translation;
        this.popup.style.display = 'block';
        this.popup.style.top = `${rect.bottom + window.scrollY + 5}px`;
        this.popup.style.left = `${rect.left + window.scrollX}px`;
    }

    hidePopup() {
        this.popup.style.display = 'none';
    }
}

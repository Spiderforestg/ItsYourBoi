export function sanitizeUserInput(input) {
    const paragraph = document.createElement('p');

    paragraph.textContent = input;

    return paragraph;
}
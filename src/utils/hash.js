export function createTodoId() {
    const min = 10000000;
    const max = 99999999;
    return getRndInteger(min, max);
}

function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1) ) + min;
}
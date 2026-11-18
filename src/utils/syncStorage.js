export function saveArrayToLocalStorage(key, array) {
    try {
        localStorage.setItem(key, JSON.stringify(array));
    }
    catch (err){
        console.log(err);
        return;
    }
    return;
}

export function loadArrayFromLocalStorage(key) {
    try {
        return JSON.parse(localStorage.getItem(key));
    }
    catch(err) {
        console.log(err);
        return;
    }
}
/**
 * SAVE ARRAY TO LOCAL STORAGE
 * Saves an array to localStorage using a given key
 */
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

/**
 * LOAD ARRAY FROM LOCAL STORAGE
 * Looks up an item in localStorage using a key and returns an array
 */
export function loadArrayFromLocalStorage(key) {
    try {
        return JSON.parse(localStorage.getItem(key));
    }
    catch(err) {
        console.log(err);
        return;
    }
}
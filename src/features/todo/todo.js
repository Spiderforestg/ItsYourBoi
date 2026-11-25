// Import todoItem Class
import { todoItem } from './todo-item-class.js';

//Import sync storage util
import { saveArrayToLocalStorage, loadArrayFromLocalStorage } from '../../utils/syncStorage.js';

// Import error handler util
import { logConsoleError } from '../../utils/errors.js';

// Import random ID generator
import { createTodoId } from '../../utils/hash.js';

// Import XP key to save to and load from localStorage
import { PET_BONUS_XP_KEY } from '../pet-home/pet-progress.mjs';

// Create an array to hold the To-do items
const todoArray = [];

// Declare variables for EXP
const XP_TODO_VALUES = [5, 10, 15];

try {
    const holdArray = loadArrayFromLocalStorage("todoList");

    console.log(`loading from LocalStorage:`);
    console.log(holdArray);

    if (holdArray && holdArray.length > 0) {
        holdArray.forEach(element => {
            // Push only objects of class "todoItem" into the array
            const newTodoItem = new todoItem(element.id, element.name, element.difficulty);
            todoArray.push(newTodoItem);
        });
    }
}
catch (err) {
    logConsoleError(err);
    console.log("Todo List is empty");
}

// Add Event listener to submit form to JS
document.getElementById('add-item-button')
        .addEventListener('click', addItem);
document.getElementById('name')
        .addEventListener('keypress', function(event) {
            // If the user presses enter, the todo item is submitted
            if (event.key == "Enter") {
                event.preventDefault();

                document.getElementById('add-item-button').click();
            }
        })

// Add EventListeners to Radio buttons and hide radio elements
const RADIO_BUTTON_VALUES_ARRAY = [
    ['easy-button', 'easy'],
    ['medium-button', 'medium'],
    ['hard-button', 'hard']
];
console.log((RADIO_BUTTON_VALUES_ARRAY));
RADIO_BUTTON_VALUES_ARRAY.forEach(element => {
    initializeRadioButton(element[0], element[1]);
});

// Add Event Listener to clear To-do list
document.getElementById('clear-list-button')
        .addEventListener('click', clearList);

// After everything else, call the first display
displayTodoList();

//##### FUNCTIONS #####

/**
 * ADD ITEM
 * The user can add an item to their to-do list
 */
function addItem(event) {
    // Get values from form
    try {
        const id = createTodoId();

        console.log(`addItem id: ${id}`);
        const nameValue = document.getElementById('name').value;
        const radioValue = document.querySelector('input[name="difficulty"]:checked')?.value || null;
        
        // DEBUG: Log form responses
        // console.log(nameValue);
        // console.log(radioValue);

        if (!nameValue || !radioValue) {
            throw new Error("Required inputs missing");
        }

        // Clear error message
        clearErrorMessage('form-error');

        // Push a new todoItem to the array and save it to localStorage
        const newTodoItem = new todoItem(id, nameValue, radioValue);
        todoArray.push(newTodoItem);

        // console.log(todoArray);

        saveArrayToLocalStorage('todoList', todoArray);

        console.log(loadArrayFromLocalStorage('todoList'));

        // Clear the input field and reset radio value
        document.getElementById('name').value = '';
        const radioInputs = document.querySelectorAll('input[name="difficulty"]');
        radioInputs.forEach(input => {
            input.checked = false;
        });
        clearButtonsBackground();

        // Display the to-do list
        displayTodoList();
    }
    catch (err) {
        logConsoleError(err);

        displayErrorMessage('form-error', "Required inputs missing");
    }

    event.preventDefault();
}

/**
 * CLEAR LIST
 * Clears the To-do List of all its items and refreshes the display
 */
function clearList() {
    while (todoArray.length > 0) {
        todoArray.pop();
    };
    saveArrayToLocalStorage('todoList', todoArray);
    
    clearErrorMessage('form-error');
    displayTodoList();
}

function displayTodoList() {
    // Display To-do Items in a table on document
    const todoTableElement = document.getElementById('todo-table');

    todoTableElement.innerHTML = `
    <tr class="todo-row">
      <td class="todo-header" "todo-completed">Completed</td>
      <td class="todo-header" "todo-name">Name</td>
      <td class="todo-header" "todo-difficulty">Difficulty</td>
    </tr>
    `
    // Loop through the To-do list array and add it to the HTML (AI-assisted)
    todoArray.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = 'todo-row';

        const completedCheckboxCell = document.createElement('td');
        completedCheckboxCell.className = 'todo-completed';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-item-checkbox';
        checkbox.id = item.id;
        checkbox.checked = Boolean(item.completed);
        initializeCheckbox(checkbox);

        completedCheckboxCell.appendChild(checkbox);

        const nameCell = document.createElement('td');
        nameCell.className = 'todo-name';
        nameCell.textContent = item.name; // Safely rendered as text

        const difficultyCell = document.createElement('td');
        difficultyCell.className = 'todo-difficulty';
        difficultyCell.textContent = item.difficulty; // Safely rendered as text

        const completedDeleteCell = document.createElement('td');
        completedDeleteCell.className = 'todo-delete';

        const deleteButtonElement = document.createElement('button');
        deleteButtonElement.textContent = 'Del';
        deleteButtonElement.className = 'todo-delete-button';
        deleteButtonElement.id = item.id;
        initializeDeleteButton(deleteButtonElement);

        completedDeleteCell.append(deleteButtonElement);

        row.append(completedCheckboxCell, nameCell, difficultyCell, completedDeleteCell);

        if (item.completed) {
            row.classList.add('completed-row');
        }

        todoTableElement.appendChild(row);
    });
}

/**
 * DISPLAY and CLEAR error messages depending on id
 */
function displayErrorMessage(id, message) {
    const errorElement = document.getElementById(id);
    errorElement.innerText = message;
}
function clearErrorMessage(id) {
    const errorElement = document.getElementById(id);
    errorElement.innerText = '';
}

/**
 * INITIALIZE RADIO BUTTON
 * Adds Event Listeners to the buttons acting as radio choices
 */
function initializeRadioButton(buttonId, radioId) {
    const buttonElement = document.getElementById(buttonId);
    const radioElement = document.getElementById(radioId);

    //Hide radio elmeent from view
    radioElement.style.display = "none";

    buttonElement.addEventListener('click', function(event) {
        event.preventDefault();

        radioElement.checked = true;

        clearButtonsBackground();
        
        buttonElement.style.backgroundColor = "lightgreen";
    })

    buttonElement.style.backgroundColor = "initial";
}
function clearButtonsBackground() {
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(button => {
        button.style.backgroundColor = "initial";
    });
}

/**
 * INITIALIZE CHECKBOX
 * Adds event listener to the checkbox to update completion status of todo item
 */
function initializeCheckbox(checkbox, checked=false) {
    checkbox.addEventListener('change', handleCheckboxChange);
}
function handleCheckboxChange(event) {
    const checkbox = event.target;
    const isChecked = checkbox.checked;

    console.log(`Checkbox id: '${checkbox.id}'`);

    if (isChecked) {
        const index = todoArray.findIndex(item => item.id == checkbox.id);
        todoArray[index].changeCompletionStatus();
        awardXp(todoArray[index].difficulty);

        todoArray.splice(index,1);
        
        saveArrayToLocalStorage("todoList", todoArray);
    }
    displayTodoList();
}

function awardXp(difficulty) {
    const CURRENT_XP = JSON.parse(localStorage.getItem(PET_BONUS_XP_KEY));
    let xpReward = 0;
    switch (difficulty) {
        case 'Easy':
            xpReward = XP_TODO_VALUES[0];
            break;
        case 'Medium':
            xpReward = XP_TODO_VALUES[1];
            break;
        case 'Hard':
            xpReward = XP_TODO_VALUES[2];
            break;
        default:
            xpReward = 0;
            break;
    };
    // console.log(`Awarding ${xpReward} XP...`);

    // Set total XP to localStorage
    localStorage.setItem(PET_BONUS_XP_KEY, CURRENT_XP + xpReward);

    // console.log(localStorage.getItem(PET_BONUS_XP_KEY));
}

function initializeDeleteButton(button) {
    button.addEventListener('click', deleteItem);
}
function deleteItem(event) {
    const button = event.target;
    const index = todoArray.findIndex(item => item.id == button.id);
    todoArray.splice(index,1);
    saveArrayToLocalStorage("todoList", todoArray);

    displayTodoList();
}



// DEBUG TESTS

/**
 * Create a new todoItem object and push it into the array
 */
/*const item1 = new todoItem("Test Todo Item","Daily");
const item2 = new todoItem("This is a weekly Todo Item","Weekly");
const item3 = new todoItem("This Todo Item should be completed only once", "Once");
listArray.push(item1);
listArray.push(item2);
listArray.push(item3);*/

/**
 * Check console to view array details
 */
//console.log(listArray);

// function debugCompletedItem() {
//     todoArray[0].changeCompletionStatus();
// }
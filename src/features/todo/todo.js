// Import todoItem Class
import { todoItem } from './todo-item-class.js';

//Import sync storage util
import { saveArrayToLocalStorage, loadArrayFromLocalStorage } from '../../utils/syncStorage.js';

// Import error handler util
import { logError } from '../../utils/errors.js';

// Create an array to hold the To-do items
const todoArray = [];

try {
    loadArrayFromLocalStorage("todoList").forEach(element => {
        // Push only objects of class "todoItem" into the array
        const newTodoItem = new todoItem(element.name, element.difficulty);
        todoArray.push(newTodoItem);
    });
}
catch (err) {
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
initializeRadioButton('easy-button','easy');
initializeRadioButton('medium-button','medium');
initializeRadioButton('hard-button','hard');

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
        const nameValue = document.getElementById('name').value;
        const radioValue = document.querySelector('input[name="difficulty"]:checked')?.value || null;
        
        // DEBUG: Log form responses
        debugLogConsole(nameValue);
        debugLogConsole(radioValue);

        if (!nameValue || !radioValue) {
            throw new Error("Required inputs missing");
        }

        // Clear error message
        clearErrorMessage('form-error');

        // Push a new todoItem to the array and save it to localStorage
        const newTodoItem = new todoItem(nameValue, radioValue);
        todoArray.push(newTodoItem);

        debugLogConsole(todoArray);

        saveArrayToLocalStorage('todoList', todoArray);

        debugLogConsole(loadArrayFromLocalStorage('todoList'));

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
        logError(err);

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
      <td class="todo-header" class="todo-name">Name</td>
      <td class="todo-header" class="todo-difficulty">Difficulty</td>
      <td class="todo-header" class="todo-completed">Completed</td>
    </tr>
    `
    // Loop through the To-do list array and add it to the HTML
    todoArray.forEach(item => {
        const todoItemElement = document.createElement('tr');
        todoItemElement.classList.add('todo-row');

        // Draws a line through items that are completed
        if (item.completed) {
            todoItemElement.classList.add('completed-row');
        }
        
        let htmlString = `
            <td class="todo-name">
                ${item.name}
            </td>
            <td class="todo-difficulty">
                ${item.difficulty}
            </td>
            <td class="todo-completed">
        `;

        if (item.completed) {
            htmlString += `Yes</td>`;
        }
        else htmlString += `No</td>`;
        
        todoItemElement.innerHTML = htmlString;

        todoTableElement.appendChild(todoItemElement);
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
//debugLogConsole(listArray);

function debugLogConsole(message) {
    console.log(message);
}

function debugCompletedItem() {
    todoArray[0].changeCompletionStatus();
}
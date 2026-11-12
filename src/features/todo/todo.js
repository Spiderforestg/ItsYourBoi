// Import todoItem Class
import { todoItem } from './todo-item-class.js';

// Create an array to hold the To-do items
let listArray = [];

// Add Event listener to submit form to JS
document.getElementById('add-item-button')
        .addEventListener('click', addItem);

function addItem(event) {
    // Get values from form
    try {
        const nameValue = document.getElementById('name').value;
        const radioValue = document.querySelector('input[name="type"]:checked')?.value || null;
        
        // DEBUG: Log form responses
        console.log(nameValue);
        console.log(radioValue);

        if (!nameValue || !radioValue) {
            throw new Error("Required inputs missing");
        }

        const newTodoItem = new todoItem(nameValue, radioValue);

        listArray.push(newTodoItem);

        displayTodoList();
    }
    catch (err) {
        console.log(err);
        
        const formErrorElement = document.getElementById('form-error');

        formErrorElement.innerText = `Required inputs missing`;
    }

    event.preventDefault();
}

// DEBUG: Create a new todoItem object and push it into the array
/*const item1 = new todoItem("Test Todo Item","Daily");
const item2 = new todoItem("This is a weekly Todo Item","Weekly");
const item3 = new todoItem("This Todo Item should be completed only once", "Once");
listArray.push(item1);
listArray.push(item2);
listArray.push(item3);*/

// DEBUG: Check console to view array details
//console.log(listArray);

function displayTodoList() {
    // Display To-do Items in a table on document
    const todoTableElement = document.getElementById('todo-table');

    todoTableElement.innerHTML =         `
    <tr class="todo-row">
      <td class="todo-header" class="todo-name">Name</td>
      <td class="todo-header" class="todo-type">Type</td>
    </tr>
    `
    // Loop through the To-do list array and add it to the HTML
    listArray.forEach(item => {
        const todoItemElement = document.createElement('tr');
        todoItemElement.classList.add('todo-row');

        todoItemElement.innerHTML = `
            <td class="todo-name">
                ${item.name}
            </td>
            <td class="todo-type">
                ${item.type}
            </td>`;

        todoTableElement.appendChild(todoItemElement);
    });
}
displayTodoList();
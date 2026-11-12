export class todoItem {
    // Item can be type "daily", "weekly", or "once"
    constructor(name, type) {
        this.name=name;
        this.type=type;
<<<<<<< HEAD
    }

    displayType() {
        console.log(this.type);
=======

        this.completed = false;
    }

    changeCompletionStatus() {
        if (this.completed == false)
            this.completed = true;
        else this.completed = false;
>>>>>>> 17-to-do-lists
    }
}
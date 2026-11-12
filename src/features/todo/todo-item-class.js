export class todoItem {
    // Item can be type "daily", "weekly", or "once"
    constructor(name, type) {
        this.name=name;
        this.type=type;

        this.completed = false;
    }

    changeCompletionStatus() {
        if (this.completed == false)
            this.completed = true;
        else this.completed = false;
    }
}
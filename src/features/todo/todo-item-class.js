export class todoItem {
    // Item can be type "daily", "weekly", or "once"
    constructor(name, difficulty) {
        this.name=name;
        this.difficulty=difficulty;
        this.completed = false;
    }

    changeCompletionStatus() {
        if (this.completed == false)
            this.completed = true;
        else this.completed = false;
    }
}
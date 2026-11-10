export class todoItem {
    // Item can be type "daily", "weekly", or "once"
    constructor(name, type) {
        this.name=name;
        this.type=type;
    }

    displayType() {
        console.log(this.type);
    }
}
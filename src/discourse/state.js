// What the discourse knows while a text is being built: which characters have been mentioned, which ones were in the last
// clause, who the topic is. From that comes the form of the next reference to a character: the first mention is indefinite,
// a character that is still in the foreground and cannot be confused with another of the same kind is a pronoun, any other
// is a definite noun phrase. A planner and the texts use the same object.
export class DiscourseState {
    constructor(actors) {
        this.actors = actors;           // key -> { head, en, pron, ... }
        this.mentioned = new Set();
        this.previous = [];             // characters of the previous clause, in order
        this.current = [];              // characters of the clause being built
        this.topic = null;              // the subject of the last finished clause
        this.subject = null;
    }
    get recent() { return [...this.previous, ...this.current]; }
    // form of the next reference: 'indef' | 'pron' | 'def'
    formOf(key) {
        if (!this.mentioned.has(key)) return 'indef';
        const a = this.actors[key], rivals = [...new Set(this.recent)].filter(x => this.actors[x].pron === a.pron);
        return this.recent.includes(key) && rivals.length <= 1 ? 'pron' : 'def';
    }
    // registers the mention and returns its form; `isSubject` marks the clause subject (the next topic)
    refer(key, isSubject = false) {
        const form = this.formOf(key);
        this.mentioned.add(key); this.current.push(key);
        if (isSubject && this.subject === null) this.subject = key;
        return form;
    }
    endClause() { this.previous = this.current; this.current = []; this.topic = this.subject ?? this.topic; this.subject = null; }
}

class ValidationError extends Error {
    constructor(message: string, origin:string) {
        super("Raised by " + origin + ": " + message);
        this.name = "ValidationError";
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

export class HashNotMatchingError extends ValidationError {
    constructor(origin:string) {
        super("Hashes do not match", origin);
        this.name = "HashNotMatchingError";
        Object.setPrototypeOf(this, HashNotMatchingError.prototype);
    }
}

export class OntologyFormatError extends ValidationError {
    constructor(message:string, origin:string) {
        super("Ontology: " + message, origin);
        this.name = "OntologyFormatError";
        Object.setPrototypeOf(this, OntologyFormatError.prototype);
    } 
}
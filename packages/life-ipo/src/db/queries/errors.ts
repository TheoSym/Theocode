export class RecordNotFoundError extends Error {
	constructor(message = "Record not found") {
		super(message)
		this.name = "RecordNotFoundError"
	}
}

export class RecordNotCreatedError extends Error {
	constructor(message = "Record not created") {
		super(message)
		this.name = "RecordNotCreatedError"
	}
}

export class RecordNotUpdatedError extends Error {
	constructor(message = "Record not updated") {
		super(message)
		this.name = "RecordNotUpdatedError"
	}
}

import {BusEvent, BusEventMap} from "./index";

/**
 * Turn the payload object into a bus event object
 * @param payload
 */
/* May inline this somehow? A function call seems to be 3% slower */
export function createBusEvent<P extends BusEventMap<P>, T extends keyof P>(type: T, payload?: P[T]) : BusEvent<P, T> {
    if(payload) {
        let event = payload as any as BusEvent<P, T>;
        event.as = as;
        event.asUnchecked = asUnchecked;
        event.asAnyUnchecked = asUnchecked;
        event.extractPayload = extractPayload;
        return event;
    } else {
        return {
            type,
            as,
            asUnchecked,
            asAnyUnchecked: asUnchecked,
            extractPayload
        } as any;
    }
}

function extractPayload() {
    const result = Object.assign({}, this);
    delete result["as"];
    delete result["asUnchecked"];
    delete result["asAnyUnchecked"];
    delete result["extractPayload"];
    return result;
}

function as(target) {
    if(this.type !== target) {
        throw "Mismatching event type. Expected: " + target + ", Got: " + this.type;
    }

    return this;
}

function asUnchecked() {
    return this;
}
import {BusEvent, BusEventMap, EventBus} from "./index";

export class SimpleEventBus<Events extends BusEventMap<Events>> implements EventBus<Events> {
    private eventHandler: { [key: string]: ((event: BusEvent<Events, keyof Events>) => void)[]} = {};

    fire<T extends keyof Events>(eventType: T, data: Events[T] | undefined) {
    }

    on<T extends keyof Events>(event: T[] | T, handler: (event: BusEvent<Events, T>) => void): () => void {
        return function () {
        };
    }

    one<T extends keyof Events>(event: T[] | T, handler: (event: BusEvent<Events, T>) => void): () => void {
        return function () {
        };
    }

    onAll(handler: (event: BusEvent<Events, keyof Events>) => void): () => void {
        return function () {
        };
    }

    offAll(handler: (event: BusEvent<Events, keyof Events>) => void) {
    }

    off(handler_or_events, handler?) {
        if(typeof handler_or_events === "function") {
            /* TODO: Unregister function for all events */
        } else if(typeof handler_or_events === "string") {
            /* TODO: Unregister function for target event */
        } else if(Array.isArray(handler_or_events)) {
            handler_or_events.forEach(handler_or_event => this.off(handler_or_event, handler));
        }
    }

    protected dispatchEvent(event: BusEvent<Events, keyof Events>) {
        let eventHandler = this.eventHandler[event.type];
        if(eventHandler) {
            let index = eventHandler.length;
            while(index--) {
                eventHandler[index](event);
            }
        }
    }
}
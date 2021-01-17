import {
    BusEvent,
    BusEventMap,
    EventBusSender,
} from "../index";
import {EventBus, SimpleEventBusReceiver} from "./Simple";

/**
 * Async event bus sender.
 * The order the events might get dispatched can be out of order!
 */
export interface AsyncEventBusSender<Events extends BusEventMap<Events> = BusEventMap<any>> {
    /**
     * Fire an event asynchronously without blocking.
     * @param eventType The target event to be fired
     * @param data The payload of the event
     * @param callback The callback will be called after the event has been successfully dispatched
     */
    fireAsync<T extends keyof Events>(eventType: T, data?: Events[T], callback?: () => void);

    /**
     * @returns true if the async events will be dispatched in order,
     *          else false will be returned.
     */
    isOrdered() : boolean;
}

/**
 * Async event bus sender but with guaranteed async emit order.
 */
export interface OrderedAsyncEventBusSender<Events extends BusEventMap<Events> = BusEventMap<any>>
    extends AsyncEventBusSender<Events> {

    isOrdered() : true;
}

export type AsyncEventBus<Events extends BusEventMap<Events>> = EventBus<Events> & AsyncEventBusSender<Events> & EventBusSender<Events>;
export type OrderedAsyncEventBus<Events extends BusEventMap<Events>> = AsyncEventBus<Events> & OrderedAsyncEventBusSender<Events>;
export type AsyncErrorHandler = (step: "dispatch" | "callback", error: any) => void;

const kDefaultErrorHandler: AsyncErrorHandler = (step, error) => {
    console.error("Failed to %s an async event: %o", step, error);
}

export class DefaultAsyncEventBusSender<Events extends BusEventMap<Events> = BusEventMap<any>>
    implements OrderedAsyncEventBusSender<Events>, EventBusSender<Events>
{
    private readonly eventDispatcher: (eventType: string, payload: any) => void;
    private readonly errorHandler: AsyncErrorHandler;

    private pendingAsyncTimeout: number;
    private pendingAsyncEvents: { eventType: any, payload: any, callback: () => void | undefined }[];

    constructor(eventDispatcher: (eventType: string, payload: any) => void, errorHandler?: AsyncErrorHandler) {
        this.eventDispatcher = eventDispatcher;
        this.errorHandler = errorHandler || kDefaultErrorHandler;
    }

    destroy() {
        clearTimeout(this.pendingAsyncTimeout);
        this.pendingAsyncEvents = undefined;
        this.pendingAsyncTimeout = undefined;
    }

    isOrdered(): true {
        return true;
    }

    fireAsync(eventType, payload?, callback?: () => void) {
        if(!this.pendingAsyncTimeout) {
            this.pendingAsyncTimeout = setTimeout(() => this.firePendingAsyncEvents());
            this.pendingAsyncEvents = [];
        }

        this.pendingAsyncEvents.push({ eventType, payload, callback });
    }

    fire(eventType, data?) {
        this.eventDispatcher(eventType, data);
    }

    private firePendingAsyncEvents() {
        const events = this.pendingAsyncEvents;

        this.pendingAsyncEvents = undefined;
        this.pendingAsyncTimeout = undefined;

        let index = 0;

        while(index < events.length) {
            const event = events[index];

            try {
                this.eventDispatcher(event.eventType, event.payload);
            } catch (error) {
                this.errorHandler("dispatch", error);
            }

            try {
                if(event.callback) {
                    event.callback();
                }
            } catch (error) {
                this.errorHandler("callback", error);
            }

            index++;
        }
    }
}

export class DefaultAsyncEventBus<Events extends BusEventMap<Events> = BusEventMap<any>> implements OrderedAsyncEventBus<Events> {
    private readonly sender: DefaultAsyncEventBusSender<Events>;
    private readonly receiver: SimpleEventBusReceiver<Events>;

    constructor() {
        this.receiver = new SimpleEventBusReceiver<Events>();
        this.sender = new DefaultAsyncEventBusSender<Events>(this.receiver.dispatchEvent.bind(this.receiver));
    }

    destroy() {
        this.sender.destroy();
        this.receiver.destroy();
    }

    isOrdered() : true {
        return true;
    }

    fire(eventType, data) {
        this.sender.fire(eventType, data);
    }

    fireAsync(eventType, data, callback) {
        this.sender.fireAsync(eventType, data, callback);
    }

    on<T extends keyof Events>(event: T[] | T, handler: (event: BusEvent<Events, T>) => void): () => void {
        return this.receiver.on(event, handler);
    }

    one<T extends keyof Events>(event: T[] | T, handler: (event: BusEvent<Events, T>) => void): () => void {
        return this.receiver.one(event, handler);
    }

    onAll(handler: (event: BusEvent<Events, keyof Events>) => void): () => void {
        return this.receiver.onAll(handler);
    }

    offAll(handler: (event: BusEvent<Events, keyof Events>) => void) {
        return this.receiver.offAll(handler);
    }

    off(handlerOrEvents, handler?) {
        return this.receiver.off(handlerOrEvents, handler);
    }

    registerHandler(handler: any, parentClasses?: boolean) {
        this.receiver.registerHandler(handler, parentClasses);
    }

    unregisterHandler(handler: any) {
        this.receiver.unregisterHandler(handler);
    }
}
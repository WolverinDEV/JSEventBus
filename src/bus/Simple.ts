import { v4 as uuidv4 } from "uuid";
import {BusEvent, BusEventMap, EventBusReceiver, EventBusSender, kEventAnnotationKey} from "../index";
import {createBusEvent} from "../BusEvent";

function objectValues(object: any, inspector: (value) => void) {
    if("values" in Object) {
        (Object as any).values(object).forEach(inspector);
    } else {
        Object.keys(object).forEach(key => inspector(object[key]));
    }
}

function arrayRemove(array: any[], object: any) {
    const index = array.indexOf(object);
    if(index !== -1) {
        array.splice(index, 1);
    }
}

interface EventHandlerRegisterData {
    registeredHandler: {[key: string]: ((event) => void)[]}
}

export class SimpleEventBusReceiver<Events extends BusEventMap<Events>> implements EventBusReceiver<Events> {
    protected readonly receiverUniqueId = uuidv4();
    protected persistentEventHandler: { [key: string]: ((event) => void)[] } = {};
    protected oneShotEventHandler: { [key: string]: ((event) => void)[] } = {};
    protected genericEventHandler: ((event) => void)[] = [];

    destroy() {
        objectValues(this.persistentEventHandler, handlers => handlers.splice(0, handlers.length));
        objectValues(this.oneShotEventHandler, handlers => handlers.splice(0, handlers.length));
        this.genericEventHandler.splice(0, this.genericEventHandler.length);
    }

    dispatchEvent<T extends keyof Events>(eventType: T, data: Events[T] | undefined) {
        const event = createBusEvent(eventType, data);

        const oneShotHandler = this.oneShotEventHandler[eventType as string];
        if(oneShotHandler) {
            delete this.oneShotEventHandler[eventType as string];
            for(const handler of oneShotHandler) {
                handler(event);
            }
        }

        for(const handler of this.persistentEventHandler[eventType as string] || []) {
            handler(event);
        }

        for(const handler of this.genericEventHandler) {
            handler(event);
        }
    }

    on(events, handler: (event) => void): () => void {
        if(!Array.isArray(events)) {
            events = [events];
        }

        for(const event of events as string[]) {
            const persistentHandler = this.persistentEventHandler[event] || (this.persistentEventHandler[event] = []);
            persistentHandler.push(handler);
        }

        return () => this.off(events, handler);
    }

    one<T extends keyof Events>(events, handler: (event) => void): () => void {
        if(!Array.isArray(events)) {
            events = [events];
        }

        for(const event of events as string[]) {
            const persistentHandler = this.oneShotEventHandler[event] || (this.oneShotEventHandler[event] = []);
            persistentHandler.push(handler);
        }

        return () => this.off(events, handler);
    }

    onAll(handler: (event: BusEvent<Events, keyof Events>) => void): () => void {
        this.genericEventHandler.push(handler);
        return () => arrayRemove(this.genericEventHandler, handler);
    }

    offAll(handler: (event: BusEvent<Events, keyof Events>) => void) {
        objectValues(this.persistentEventHandler, persistentHandler => arrayRemove(persistentHandler, handler));
        objectValues(this.oneShotEventHandler, oneShotHandler => arrayRemove(oneShotHandler, handler));
        arrayRemove(this.genericEventHandler, handler);
    }

    off(handlerOrEvents, handler?) {
        if(typeof handlerOrEvents === "function") {
            this.offAll(handler);
        } else if(typeof handlerOrEvents === "string") {
            if(this.persistentEventHandler[handlerOrEvents]) {
                arrayRemove(this.persistentEventHandler[handlerOrEvents], handler);
            }

            if(this.oneShotEventHandler[handlerOrEvents]) {
                arrayRemove(this.oneShotEventHandler[handlerOrEvents], handler);
            }
        } else if(Array.isArray(handlerOrEvents)) {
            handlerOrEvents.forEach(handler_or_event => this.off(handler_or_event, handler));
        }
    }

    registerHandler(handler: any, parentClasses?: boolean) {
        if(typeof handler !== "object") {
            throw "event handler must be an object";
        }

        if(typeof handler[this.receiverUniqueId] !== "undefined") {
            throw "event handler already registered";
        }

        const prototype = Object.getPrototypeOf(handler);
        if(typeof prototype !== "object") {
            throw "event handler must have a prototype";
        }

        const data = handler[this.receiverUniqueId] = {
            registeredHandler: {}
        } as EventHandlerRegisterData;

        let currentPrototype = prototype;
        do {
            Object.getOwnPropertyNames(currentPrototype).forEach(functionName => {
                if(functionName === "constructor") {
                    return;
                }

                if(typeof prototype[functionName] !== "function") {
                    return;
                }

                if(typeof prototype[functionName][kEventAnnotationKey] !== "object") {
                    return;
                }

                const eventData = prototype[functionName][kEventAnnotationKey];
                const eventHandler = event => prototype[functionName].call(handler, event);
                for(const event of eventData.events) {
                    const registeredHandler = data.registeredHandler[event] || (data.registeredHandler[event] = []);
                    registeredHandler.push(eventHandler);

                    this.on(event, eventHandler);
                }
            });

            if(!parentClasses) {
                break;
            }
        } while ((currentPrototype = Object.getPrototypeOf(currentPrototype)));
    }

    unregisterHandler(handler: any) {
        if(typeof handler !== "object") {
            throw "event handler must be an object";
        }

        if(typeof handler[this.receiverUniqueId] === "undefined") {
            throw "event handler not registered";
        }

        const data = handler[this.receiverUniqueId] as EventHandlerRegisterData;
        delete handler[this.receiverUniqueId];

        for(const event of Object.keys(data.registeredHandler)) {
            for(const handler of data.registeredHandler[event]) {
                this.off(event, handler);
            }
        }
    }
}

export class SimpleEventBus<Events extends BusEventMap<Events>> implements EventBus<Events> {
    private readonly receiver: SimpleEventBusReceiver<Events>;

    constructor() {
        this.receiver = new SimpleEventBusReceiver<Events>();
    }

    destroy() {
        this.receiver.destroy();
    }

    fire<T extends keyof Events>(eventType: T, data: Events[T] | undefined) {
        this.receiver.dispatchEvent(eventType, data);
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

export type EventBus<Events extends BusEventMap<Events>> = EventBusReceiver<Events> & EventBusSender<Events>;
/* Compile tests */
import {
    BusEvent,
    BusEventMap,
    EventBusReceiver,
    EventBusSender,
} from "./index";
import {AsyncEventBusSender, OrderedAsyncEventBusSender} from "./bus/Async";

interface TestEventMap {
    "event-a": {},
    "event-b": { num1: number, obj2: number | string },
    "event-c": { test: { type: string } }
}

/*
function eventObject<Events extends BusEventMap<Events>, T extends BusEvent<Events, T>>(obj: T) {}

eventObject({ type: "event-a" });
*/

function test1(event: BusEvent<TestEventMap, "event-c" | "event-a">) {
}

function test2(events: EventBusReceiver) {
    events.on("asd", event => event.as("asd").type)
}

function test3(events: EventBusReceiver<TestEventMap>) {
    events.on(["event-c", "event-a"], event => {
        event.asAnyUnchecked("event-c");
    });
}

function x(a: [number, string]) {}

type EventBus<Events extends BusEventMap<Events>> = EventBusReceiver<Events> & EventBusSender<Events>;
type AsyncEventBus<Events extends BusEventMap<Events>> = EventBus<Events> & AsyncEventBusSender<Events>;
type OrderedAsyncEventBus<Events extends BusEventMap<Events>> = EventBus<Events> & OrderedAsyncEventBusSender<Events>;

function a(events: OrderedAsyncEventBus<TestEventMap>) {
    events.fireAsync("event-a", {});
}

{
    let array = new Array(1024);
    for(let i = 0; i < 10; i++) {
        array[i] = i;
    }

    while(array.length !== 0) {
        let index = Math.random() * array.length;
        array.splice(index, 1);
    }
}

{
    let array = new Array(1024);
    for(let i = 0; i < 10; i++) {
        array[i] = i;
    }

    while(array.length !== 0) {
        let index = Math.random() * array.length;
        array[index] = array[array.length - 1];
        array.splice(array.length - 1, 1);
    }
}
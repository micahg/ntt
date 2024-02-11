import {
  setCallback,
  StateMachine,
  transitionStateMachine,
} from "./statemachine";

export class MouseStateMachine implements StateMachine {
  current: string;
  states: Record<string, Record<string, string>>;
  actions: Record<string, (args: unknown[]) => void>;
  buttons = 0;
  startX = -1;
  startY = -1;
  endX = 0;
  endY = 0;
  startCallback: (() => void) | null = null;
  moveCallback:
    | ((
        buttons: number,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
      ) => void)
    | null = null;

  constructor() {
    this.current = "wait";
    this.actions = {};
    this.states = {
      // before anything happens
      wait: {
        push: "push",
        background: "background_select",
        zoomOut: "zoomOut",
        clear: "clear",
        down: "record_mouse", // canvas interaction with no tool selected (pan/zoom)
        /**********************/
        // don't add more of these -- these (paint, select, whatever else) are just instances of
        // recording -- it should probably be a "record" state and then track what the recording means
        // in the component.
        select: "select",
        paint: "paint",
        /**********************/
        opacity: "opacity_select",
        rotateClock: "rotate_clock",
        wheel: "zoom",
      },
      // after select or paint is done
      complete: {
        down: "record_mouse", // canvas interaction with no tool selected (pan/zoom)
        background: "background_select",
        select: "select",
        paint: "paint",
        obscure: "obscure",
        reveal: "reveal",
        zoomIn: "zoomIn",
        wait: "wait",
      },
      push: {
        done: "wait",
      },
      record_mouse: {
        // recording movement
        move: "record_mouse",
        up: "complete",
        out: "complete",
        down: "record_mouse",
        wait: "wait", // for situations like paint->record_mouse where we show translucent brush
      },
      obscure: {
        wait: "wait",
      },
      reveal: {
        wait: "wait",
      },
      zoom: {
        wait: "wait",
      },
      background_select: {
        link: "background_link",
        upload: "background_upload",
        down: "record_mouse",
      },
      background_link: {
        done: "wait",
      },
      background_upload: {
        done: "wait",
      },
      clear: {
        done: "wait",
      },
      select: {
        wait: "wait",
        down: "selecting",
      },
      selecting: {
        move: "record_mouse",
        up: "wait",
      },
      paint: {
        wait: "wait",
        down: "painting",
        move: "record_mouse",
      },
      painting: {
        move: "record_mouse",
        up: "wait", // use paint instead of wait if you want to enable multiple strokes
      },
      opacity_select: {
        display: "opacity_display",
        render: "opacity_render",
        down: "record_mouse",
      },
      opacity_display: {
        down: "record_mouse",
        change: "update_display_opacity",
        wait: "wait",
      },
      update_display_opacity: {
        down: "record_mouse",
        change: "update_display_opacity",
        wait: "wait",
      },
      opacity_render: {
        down: "record_mouse",
        change: "update_render_opacity",
        wait: "wait",
      },
      update_render_opacity: {
        down: "record_mouse",
        change: "update_render_opacity",
        wait: "wait",
      },
      rotate_clock: {
        done: "wait",
      },
    };
    setCallback(this, "record_mouse", this.doRecord);
  }

  transition(input: string, ...args: unknown[]): void {
    if (this.current === "complete" && input === "down")
      this.resetCoordinates();
    transitionStateMachine(this, input, args[0]);
  }

  doRecord(args: unknown[]) {
    // process consumer record callback first
    if ("record" in this.actions) this.actions["record"](args);

    // deal with recording mouse events
    // const evt: MouseEvent = args[0];
    const evt = args[0];
    // there has got to be a better way
    if (
      !evt ||
      typeof evt !== "object" ||
      !("offsetX" in evt) ||
      !("offsetY" in evt) ||
      !("buttons" in evt) ||
      typeof evt.buttons !== "number" ||
      typeof evt.offsetX !== "number" ||
      typeof evt.offsetY !== "number"
    ) {
      return;
    }
    // TODO stop recording start/end coordinates -- let the recipient do it
    if (this.startX < 0) {
      this.startX = evt.offsetX;
      this.startY = evt.offsetY;
      if (this.startCallback) this.startCallback();
    } else {
      this.endY = evt.offsetY;
      this.endX = evt.offsetX;
      if (this.moveCallback)
        this.moveCallback(
          evt.buttons,
          this.startX,
          this.startY,
          this.endX,
          this.endY,
        );
    }
  }

  public resetCoordinates() {
    this.startX = -1;
    this.startY = -1;
    this.endX = -1;
    this.endY = -1;
  }

  // public getCoordinates() { return [this.startX, this.startY, this.endX, this.endY]; }
  public x1() {
    return this.startX;
  }
  public x2() {
    return this.endX;
  }
  public y1() {
    return this.startY;
  }
  public y2() {
    return this.endY;
  }

  public setMoveCallback(
    cb: (
      buttons: number,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
    ) => void,
  ) {
    this.moveCallback = cb;
  }
  public setStartCallback(cb: () => void) {
    this.startCallback = cb;
  }
}

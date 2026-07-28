/* ==========================================================
   GREENLIFE UI FRAMEWORK v2.0 (ENTERPRISE PRODUCTION BUNDLE)
   Target Engine: GoHighLevel (GHL) Landing Pages, Funnels & Websites
   Architecture: WeakMap Lifecycle, Scrolled Tracking, Leak-Free GSAP Engine
========================================================== */

((global) => {
    "use strict";

    // Prevent duplicate framework initialization
    if (global.GreenLife || global.GL) {
        if (global.GreenLife?.isInitialized) {
            console.warn("[GreenLife UI] Framework instance already active.");
            return;
        }
    }

    /* ==========================================================
       1. CORE ENGINE & LIFECYCLE MANAGER
    ========================================================== */
    class GreenLifeEngine {
        constructor() {
            this.version = "2.0.0";
            this.plugins = new Map();
            this.instances = new WeakMap();
            this.globalListeners = [];
            this.isInitialized = false;

            // Runtime Configuration & Environment Detection
            this.config = {
                debug: false,
                reducedMotion: global.matchMedia("(prefers-reduced-motion: reduce)").matches,
                isGHLBuilder: this._detectGHLBuilder(),
                duration: { xs: 0.3, sm: 0.5, md: 0.8, lg: 1.2, xl: 1.6 },
                stagger: { fast: 0.08, normal: 0.15, slow: 0.25 },
                ease: { reveal: "power3.out", hero: "expo.out", smooth: "power2.out", image: "power4.out" }
            };

            // Shared Global Storage
            this.store = {
                lenis: null,
                resizeObserver: null,
                mutationObserver: null,
                mouse: { x: 0, y: 0 },
                scrollDirection: "down",
                lastScrollY: 0
            };

            // Custom Event Bus
            this.listeners = {};
        }

        /* ------------------------------------------------------
           Environment & Builder Detection
        ------------------------------------------------------ */
        _detectGHLBuilder() {
            try {
                const href = global.location.href.toLowerCase();
                const isBuilderURL = href.includes("/builder/") || href.includes("/page-builder/") || href.includes("preview=true");
                const isIframeBuilder = global.parent && global.parent !== global && global.parent.location.href.toLowerCase().includes("/builder/");
                const hasBuilderDOM = document.body?.classList.contains("builder-mode") || !!document.querySelector(".hl-builder-app");
                return isBuilderURL || isIframeBuilder || hasBuilderDOM;
            } catch (e) {
                return false;
            }
        }

        /* ------------------------------------------------------
           Event Bus Implementation
        ------------------------------------------------------ */
        on(event, fn) {
            (this.listeners[event] = this.listeners[event] || []).push(fn);
        }

        off(event, fn) {
            if (!this.listeners[event]) return;
            this.listeners[event] = this.listeners[event].filter(cb => cb !== fn);
        }

        emit(event, payload = {}) {
            if (!this.listeners[event]) return;
            this.listeners[event].forEach(fn => fn(payload));
        }

        /* ------------------------------------------------------
           Plugin Registration & Instance Context
        ------------------------------------------------------ */
        registerPlugin(name, pluginDef) {
            if (this.plugins.has(name)) {
                console.warn(`[GreenLife UI] Plugin '${name}' is already registered.`);
                return;
            }
            if (typeof pluginDef.init !== "function") {
                console.error(`[GreenLife UI] Plugin '${name}' must implement an init() method.`);
                return;
            }
            this.plugins.set(name, pluginDef);
        }

        _getElementRecord(element) {
            let record = this.instances.get(element);
            if (!record) {
                record = {
                    plugins: new Map(),
                    triggers: [],
                    timelines: [],
                    listeners: [],
                    observers: [],
                    data: {}
                };
                this.instances.set(element, record);
            }
            return record;
        }

        /* ------------------------------------------------------
           DOM Scanner (No dataset mutations during query)
        ------------------------------------------------------ */
        scan(scope = document) {
            const elements = new Set();

            // Query explicit data attributes
            scope.querySelectorAll("[data-gl]").forEach(el => elements.add(el));

            // Legacy class selector mapping (Read-only query, no DOM mutations)
            const legacySelectors = [
                ".gl-js-reveal",
                ".gl-js-reveal-left",
                ".gl-js-reveal-right",
                ".gl-js-scale",
                ".gl-js-split",
                "[data-gl-progress]"
            ];

            legacySelectors.forEach(selector => {
                scope.querySelectorAll(selector).forEach(el => elements.add(el));
            });

            return [...elements];
        }

        /* ------------------------------------------------------
           Dispatcher & Mounting
        ------------------------------------------------------ */
        dispatch(element) {
            if (!element || element.nodeType !== 1) return;

            const record = this._getElementRecord(element);

            // Determine active plugin names
            const pluginNames = new Set();
            if (element.dataset.gl) {
                element.dataset.gl.split(" ").forEach(name => {
                    if (name.trim()) pluginNames.add(name.trim());
                });
            }

            // Map legacy class selectors
            if (element.classList.contains("gl-js-reveal")) pluginNames.add("reveal");
            if (element.classList.contains("gl-js-reveal-left")) pluginNames.add("left");
            if (element.classList.contains("gl-js-reveal-right")) pluginNames.add("right");
            if (element.classList.contains("gl-js-scale")) pluginNames.add("scale");
            if (element.classList.contains("gl-js-split")) pluginNames.add("split");
            if (element.hasAttribute("data-gl-progress")) pluginNames.add("progress");

            pluginNames.forEach(name => {
                if (record.plugins.has(name)) return; // Already initialized

                const plugin = this.plugins.get(name);
                if (!plugin) return;

                // Plugin Context API
                const context = {
                    addTrigger: (trig) => record.triggers.push(trig),
                    addTween: (tween) => record.timelines.push(tween),
                    addListener: (target, type, handler, options) => {
                        target.addEventListener(type, handler, options);
                        record.listeners.push({ target, type, handler, options });
                    },
                    addObserver: (obs) => record.observers.push(obs),
                    setData: (key, val) => { record.data[key] = val; },
                    getData: (key) => record.data[key]
                };

                try {
                    plugin.init(element, context, this.config);
                    record.plugins.set(name, plugin);
                } catch (err) {
                    console.error(`[GreenLife UI] Error initializing plugin '${name}':`, err);
                }
            });
        }

        /* ------------------------------------------------------
           Framework Start & Lifecycle
        ------------------------------------------------------ */
        start(scope = document) {
            if (this.isInitialized) return;

            // Dependency Check
            if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
                console.warn("[GreenLife UI] GSAP or ScrollTrigger dependency missing.");
                return;
            }

            gsap.registerPlugin(ScrollTrigger);

            // Bypass motion if reduced motion or GHL Builder Editor active
            if (this.config.reducedMotion || this.config.isGHLBuilder) {
                if (this.config.isGHLBuilder) {
                    console.info("[GreenLife UI] GoHighLevel Builder detected. Animations bypassed for editor canvas.");
                }
                this.isInitialized = true;
                this.emit("ready");
                return;
            }

            // Init Lenis smooth scroll driver
            this._initLenis();

            // Init global window/pointer drivers
            this._bindGlobalDrivers();

            // Init dynamic MutationObserver
            this._initMutationObserver();

            // Mount scanned elements
            const elements = this.scan(scope);
            elements.forEach(el => this.dispatch(el));

            this.isInitialized = true;
            this.emit("ready");
        }

        /* ------------------------------------------------------
           Lenis Integration (GHL Safe)
        ------------------------------------------------------ */
        _initLenis() {
            if (typeof Lenis === "undefined" || this.store.lenis) return;

            // Check if page contains active modal / popup open class
            const isModalActive = document.body.classList.contains("gl-modal-open") || document.body.classList.contains("modal-open");
            if (isModalActive) return;

            this.store.lenis = new Lenis({
                duration: 1.2,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                smoothWheel: true,
                smoothTouch: false,
                touchMultiplier: 1.5
            });

            this.store.lenis.on("scroll", ScrollTrigger.update);

            gsap.ticker.add((time) => {
                this.store.lenis?.raf(time * 1000);
            });

            // Safe lag smoothing fallback
            gsap.ticker.lagSmoothing(500, 33);
        }

        /* ------------------------------------------------------
           Global Window & Pointer Drivers
        ------------------------------------------------------ */
        _bindGlobalDrivers() {
            // Throttled Pointer Position Driver
            let ticking = false;
            const onPointerMove = (e) => {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        this.store.mouse.x = e.clientX;
                        this.store.mouse.y = e.clientY;
                        ticking = false;
                    });
                    ticking = true;
                }
            };
            global.addEventListener("pointermove", onPointerMove, { passive: true });
            this.globalListeners.push({ target: global, type: "pointermove", handler: onPointerMove });

            // Debounced Resize Driver
            let resizeTimer;
            const onResize = () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    this.refresh();
                    this.emit("resize");
                }, 200);
            };
            global.addEventListener("resize", onResize);
            this.globalListeners.push({ target: global, type: "resize", handler: onResize });
        }

        /* ------------------------------------------------------
           Dynamic MutationObserver
        ------------------------------------------------------ */
        _initMutationObserver() {
            if (!global.MutationObserver || this.store.mutationObserver) return;

            this.store.mutationObserver = new MutationObserver(records => {
                records.forEach(record => {
                    record.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.hasAttribute?.("data-gl") || node.className?.includes?.("gl-js-")) {
                                this.dispatch(node);
                            }
                            node.querySelectorAll?.("[data-gl], .gl-js-reveal, .gl-js-split").forEach(child => {
                                this.dispatch(child);
                            });
                        }
                    });
                });
            });

            this.store.mutationObserver.observe(document.body, { childList: true, subtree: true });
        }

        /* ------------------------------------------------------
           Refresh & Destroy Lifecycle
        ------------------------------------------------------ */
        refresh() {
            this.plugins.forEach((plugin) => {
                if (typeof plugin.refresh === "function") plugin.refresh();
            });
            ScrollTrigger.refresh();
            this.emit("refresh");
        }

        destroyElement(element) {
            const record = this.instances.get(element);
            if (!record) return;

            // Kill only ScrollTriggers created by GreenLife on this element
            record.triggers.forEach(trig => {
                if (trig && typeof trig.kill === "function") trig.kill();
            });

            // Kill only timelines/tweens created by GreenLife on this element
            record.timelines.forEach(tween => {
                if (tween && typeof tween.kill === "function") tween.kill();
            });

            // Unbind DOM listeners
            record.listeners.forEach(({ target, type, handler, options }) => {
                target.removeEventListener(type, handler, options);
            });

            // Disconnect Observers
            record.observers.forEach(obs => {
                if (obs && typeof obs.disconnect === "function") obs.disconnect();
            });

            // Execute Plugin destroy hooks
            record.plugins.forEach((plugin) => {
                if (typeof plugin.destroy === "function") {
                    plugin.destroy(element, record.data);
                }
            });

            this.instances.delete(element);
        }

        destroy() {
            // Disconnect MutationObserver
            if (this.store.mutationObserver) {
                this.store.mutationObserver.disconnect();
                this.store.mutationObserver = null;
            }

            // Unbind global drivers
            this.globalListeners.forEach(({ target, type, handler }) => {
                target.removeEventListener(type, handler);
            });
            this.globalListeners = [];

            // Destroy Lenis
            if (this.store.lenis) {
                this.store.lenis.destroy();
                this.store.lenis = null;
            }

            // Destroy all tracked elements
            const elements = this.scan(document);
            elements.forEach(el => this.destroyElement(el));

            this.isInitialized = false;
            this.emit("destroy");
        }
    }

    // Initialize Singleton
    const GLInstance = new GreenLifeEngine();

    /* ==========================================================
       2. OFFICIAL PLUGIN SUITE
    ========================================================== */

    /* ------------------------------------------------------
       REVEAL PLUGIN (Fade, Directions, Scale)
    ------------------------------------------------------ */
    GLInstance.registerPlugin("reveal", {
        init(element, ctx, config) {
            const direction = element.dataset.glDirection || "up";
            const delay = parseFloat(element.dataset.glDelay || 0);
            const duration = parseFloat(element.dataset.glDuration || config.duration.md);
            const ease = element.dataset.glEase || config.ease.reveal;
            const distance = parseFloat(element.dataset.glY || element.dataset.glDistance || 40);

            const offsets = {
                up: { y: distance, x: 0 },
                down: { y: -distance, x: 0 },
                left: { x: -distance, y: 0 },
                right: { x: distance, y: 0 },
                none: { x: 0, y: 0 }
            };

            const offset = offsets[direction] || offsets.up;

            gsap.set(element, {
                opacity: 0,
                x: offset.x,
                y: offset.y
            });

            const tween = gsap.to(element, {
                opacity: 1,
                x: 0,
                y: 0,
                duration,
                delay,
                ease,
                paused: true
            });

            ctx.addTween(tween);

            const trigger = ScrollTrigger.create({
                trigger: element,
                start: element.dataset.glStart || "top 88%",
                once: true,
                onEnter: () => tween.play()
            });

            ctx.addTrigger(trigger);
        }
    });

    // Register Legacy Aliases Mapping to Reveal Engine
    GLInstance.registerPlugin("left", {
        init(element, ctx, config) {
            element.dataset.glDirection = "left";
            GLInstance.plugins.get("reveal").init(element, ctx, config);
        }
    });

    GLInstance.registerPlugin("right", {
        init(element, ctx, config) {
            element.dataset.glDirection = "right";
            GLInstance.plugins.get("reveal").init(element, ctx, config);
        }
    });

    GLInstance.registerPlugin("scale", {
        init(element, ctx, config) {
            const delay = parseFloat(element.dataset.glDelay || 0);
            const duration = parseFloat(element.dataset.glDuration || config.duration.lg);

            gsap.set(element, { opacity: 0, scale: 0.93 });

            const tween = gsap.to(element, {
                opacity: 1,
                scale: 1,
                duration,
                delay,
                ease: config.ease.reveal,
                paused: true
            });

            ctx.addTween(tween);

            const trigger = ScrollTrigger.create({
                trigger: element,
                start: element.dataset.glStart || "top 88%",
                once: true,
                onEnter: () => tween.play()
            });

            ctx.addTrigger(trigger);
        }
    });

    /* ------------------------------------------------------
       SPLIT TEXT PLUGIN (Accessible + Responsive Re-split)
    ------------------------------------------------------ */
    GLInstance.registerPlugin("split", {
        init(element, ctx, config) {
            if (typeof SplitType === "undefined") return;

            // Accessibility: Preserve full original text for screen readers
            const originalText = element.textContent.trim();
            element.setAttribute("aria-label", originalText);

            let splitInstance = null;

            const createSplit = () => {
                if (splitInstance) splitInstance.revert();

                splitInstance = new SplitType(element, {
                    types: "lines,words",
                    lineClass: "gl-split-line",
                    wordClass: "gl-split-word"
                });

                // Hide split lines for screen readers (aria-hidden)
                if (splitInstance.lines) {
                    splitInstance.lines.forEach(line => line.setAttribute("aria-hidden", "true"));
                }

                gsap.set(splitInstance.lines, { yPercent: 100, opacity: 0 });

                const tween = gsap.to(splitInstance.lines, {
                    yPercent: 0,
                    opacity: 1,
                    stagger: parseFloat(element.dataset.glStagger || config.stagger.fast),
                    duration: parseFloat(element.dataset.glDuration || config.duration.lg),
                    ease: config.ease.hero,
                    paused: true
                });

                ctx.addTween(tween);

                const trigger = ScrollTrigger.create({
                    trigger: element,
                    start: element.dataset.glStart || "top 88%",
                    once: true,
                    onEnter: () => tween.play()
                });

                ctx.addTrigger(trigger);
            };

            createSplit();
            ctx.setData("splitInstance", splitInstance);

            // Responsive ResizeObserver for Width-Change Re-splitting
            if (global.ResizeObserver) {
                let lastWidth = element.offsetWidth;
                const obs = new ResizeObserver(() => {
                    if (element.offsetWidth !== lastWidth) {
                        lastWidth = element.offsetWidth;
                        createSplit();
                    }
                });
                obs.observe(element);
                ctx.addObserver(obs);
            }
        },
        destroy(element, data) {
            if (data.splitInstance && typeof data.splitInstance.revert === "function") {
                data.splitInstance.revert();
            }
            element.removeAttribute("aria-label");
        }
    });

    /* ------------------------------------------------------
       IMAGE REVEAL PLUGIN
    ------------------------------------------------------ */
    GLInstance.registerPlugin("image", {
        init(element, ctx, config) {
            const img = element.querySelector("img") || element;

            gsap.set(element, { overflow: "hidden" });
            gsap.set(img, { scale: 1.15 });

            const tl = gsap.timeline({ paused: true });
            tl.to(img, {
                scale: 1,
                duration: parseFloat(element.dataset.glDuration || 1.4),
                ease: config.ease.image
            });

            ctx.addTween(tl);

            const trigger = ScrollTrigger.create({
                trigger: element,
                start: element.dataset.glStart || "top 85%",
                once: true,
                onEnter: () => tl.play()
            });

            ctx.addTrigger(trigger);
        }
    });

    /* ------------------------------------------------------
       PARALLAX PLUGIN
    ------------------------------------------------------ */
    GLInstance.registerPlugin("parallax", {
        init(element, ctx, config) {
            const speed = parseFloat(element.dataset.glSpeed || 0.15);

            const tween = gsap.to(element, {
                yPercent: speed * 100,
                ease: "none",
                scrollTrigger: {
                    trigger: element,
                    scrub: true,
                    start: "top bottom",
                    end: "bottom top"
                }
            });

            ctx.addTween(tween);
        }
    });

    /* ------------------------------------------------------
       STAGGER PLUGIN
    ------------------------------------------------------ */
    GLInstance.registerPlugin("stagger", {
        init(container, ctx, config) {
            const children = [...container.children];
            if (!children.length) return;

            const staggerDelay = parseFloat(container.dataset.glStagger || config.stagger.normal);
            const duration = parseFloat(container.dataset.glDuration || config.duration.md);

            gsap.set(children, { opacity: 0, y: 35 });

            const tl = gsap.timeline({ paused: true });
            tl.to(children, {
                opacity: 1,
                y: 0,
                stagger: staggerDelay,
                duration,
                ease: config.ease.reveal
            });

            ctx.addTween(tl);

            const trigger = ScrollTrigger.create({
                trigger: container,
                start: container.dataset.glStart || "top 85%",
                once: true,
                onEnter: () => tl.play()
            });

            ctx.addTrigger(trigger);
        }
    });

    /* ------------------------------------------------------
       COUNTER PLUGIN
    ------------------------------------------------------ */
    GLInstance.registerPlugin("counter", {
        init(element, ctx, config) {
            const target = Number(element.dataset.glTarget || element.textContent.replace(/,/g, ""));
            const prefix = element.dataset.glPrefix || "";
            const suffix = element.dataset.glSuffix || "";
            const decimals = parseInt(element.dataset.glDecimals || 0, 10);
            const duration = parseFloat(element.dataset.glDuration || 2);

            const state = { value: 0 };

            const tween = gsap.to(state, {
                value: target,
                duration,
                ease: "power2.out",
                paused: true,
                onUpdate() {
                    element.textContent = prefix + state.value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + suffix;
                }
            });

            ctx.addTween(tween);

            const trigger = ScrollTrigger.create({
                trigger: element,
                start: element.dataset.glStart || "top 88%",
                once: true,
                onEnter: () => tween.play()
            });

            ctx.addTrigger(trigger);
        }
    });

    /* ------------------------------------------------------
       FLOAT PLUGIN (Infinite Smooth Yoyo)
    ------------------------------------------------------ */
    GLInstance.registerPlugin("float", {
        init(element, ctx, config) {
            const distance = parseFloat(element.dataset.glDistance || 12);
            const duration = parseFloat(element.dataset.glDuration || 4);

            const tween = gsap.to(element, {
                y: -distance,
                repeat: -1,
                yoyo: true,
                duration,
                ease: "sine.inOut"
            });

            ctx.addTween(tween);
        }
    });

    /* ------------------------------------------------------
       MARQUEE PLUGIN
    ------------------------------------------------------ */
    GLInstance.registerPlugin("marquee", {
        init(track, ctx, config) {
            const speed = parseFloat(track.dataset.glSpeed || 40);
            const width = track.scrollWidth / 2;

            const tween = gsap.to(track, {
                x: -width,
                ease: "none",
                repeat: -1,
                duration: width / speed
            });

            ctx.addTween(tween);
        }
    });

    /* ------------------------------------------------------
       MAGNETIC PLUGIN (Throttled rAF Pointer Tracking)
    ------------------------------------------------------ */
    GLInstance.registerPlugin("magnetic", {
        init(element, ctx, config) {
            const strength = parseFloat(element.dataset.glStrength || 0.35);
            let rect = null;

            const updateRect = () => { rect = element.getBoundingClientRect(); };
            updateRect();

            ctx.addListener(element, "mouseenter", updateRect);
            ctx.addListener(global, "resize", updateRect);

            let pointerX = 0, pointerY = 0, ticking = false;

            const onMouseMove = (e) => {
                if (!rect) updateRect();
                pointerX = e.clientX - rect.left - rect.width / 2;
                pointerY = e.clientY - rect.top - rect.height / 2;

                if (!ticking) {
                    requestAnimationFrame(() => {
                        gsap.to(element, {
                            x: pointerX * strength,
                            y: pointerY * strength,
                            duration: 0.4,
                            ease: "power2.out",
                            overwrite: true
                        });
                        ticking = false;
                    });
                    ticking = true;
                }
            };

            const onMouseLeave = () => {
                gsap.to(element, {
                    x: 0,
                    y: 0,
                    duration: 0.6,
                    ease: "elastic.out(1, 0.4)",
                    overwrite: true
                });
            };

            ctx.addListener(element, "mousemove", onMouseMove);
            ctx.addListener(element, "mouseleave", onMouseLeave);
        }
    });

    /* ------------------------------------------------------
       READING PROGRESS PLUGIN
    ------------------------------------------------------ */
    GLInstance.registerPlugin("progress", {
        init(bar, ctx, config) {
            const tween = gsap.to(bar, {
                scaleX: 1,
                ease: "none",
                transformOrigin: "left center",
                scrollTrigger: {
                    trigger: document.documentElement,
                    start: "top top",
                    end: "bottom bottom",
                    scrub: true
                }
            });

            ctx.addTween(tween);
        }
    });

    /* ==========================================================
       3. PUBLIC API & AUTO-BOOT
    ========================================================== */
    global.GreenLife = {
        start: (scope) => GLInstance.start(scope),
        refresh: () => GLInstance.refresh(),
        destroy: () => GLInstance.destroy(),
        registerPlugin: (name, plugin) => GLInstance.registerPlugin(name, plugin),
        on: (evt, fn) => GLInstance.on(evt, fn),
        off: (evt, fn) => GLInstance.off(evt, fn),
        version: GLInstance.version,
        config: GLInstance.config,
        store: GLInstance.store,
        isInitialized: GLInstance.isInitialized
    };

    // Alias Namespace
    global.GL = global.GreenLife;

    // Auto Boot Handler
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => global.GreenLife.start());
    } else {
        global.GreenLife.start();
    }

})(typeof window !== "undefined" ? window : this);
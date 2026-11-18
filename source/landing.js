// Landing page 27 behaviour. No framework, no dependencies.
//
//   1. Reveals      – [data-reveal] fade + rise once seen; [data-words] headings rise word by word out of a blur
//   2. Menu         – the nav's menu button opens the link panel; Esc, an outside click or a link click closes it
//   3. Hero face    – the little round avatar swaps between its photos every 2.5 s while on screen
//   4. Stack        – project cards: the card underneath shrinks / dims a touch as the next one slides over it
//   5. Testimonials – the faces are a tablist (click, ← → Home End); auto-advance every 6 s while visible,
//                     paused on hover or keyboard focus
//   6. Legal popup  – [data-legal] opens its <dialog>
//
// Without JS everything is simply shown. Under prefers-reduced-motion html gets .reduced (no swaps, no autoplay).

const root = document.documentElement;
root.classList.remove('no-js');
root.classList.add('js');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduced) root.classList.add('reduced');

// ---------- 1. Reveals ------------------------------------------------------------------------------
document.querySelectorAll('[data-words]').forEach((el) => {
    let n = 0;
    const walk = (node) => [...node.childNodes].forEach((c) => {
        if (c.nodeType === 3) {
            const frag = document.createDocumentFragment();
            c.textContent.split(/(\s+)/).forEach((part) => {
                if (!part) return;
                if (/^\s+$/.test(part)) { frag.append(' '); return; }
                const w = document.createElement('span');
                w.className = 'word';
                w.style.setProperty('--w', n++);
                w.textContent = part;
                frag.append(w);
            });
            c.replaceWith(frag);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
    });
    walk(el);
});
const seen = document.querySelectorAll('[data-reveal], [data-words]');
if (reduced || !('IntersectionObserver' in window)) {
    seen.forEach((el) => el.classList.add('is-in'));
} else {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
    }), { rootMargin: '0px 0px -6% 0px', threshold: 0.1 });
    seen.forEach((el) => io.observe(el));
}
const whileVisible = (el, fn) => {
    if (!('IntersectionObserver' in window)) return fn(true);
    new IntersectionObserver(([e]) => fn(e.isIntersecting), { threshold: 0.3 }).observe(el);
};

// ---------- 2. Menu ---------------------------------------------------------------------------------
const nav = document.querySelector('[data-nav]');
if (nav) {
    const btn = nav.querySelector('[data-nav-btn]');
    const menu = nav.querySelector('[data-nav-menu]');
    const links = [...menu.querySelectorAll('a')];
    const set = (open, { focus = false } = {}) => {
        nav.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
        btn.setAttribute('aria-label', open ? btn.dataset.closeLabel : btn.dataset.openLabel);
        links.forEach((a) => { a.tabIndex = open ? 0 : -1; });
        if (focus) btn.focus();
    };
    set(false);
    btn.addEventListener('click', () => set(!nav.classList.contains('is-open')));
    links.forEach((a) => a.addEventListener('click', () => set(false)));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav.classList.contains('is-open')) set(false, { focus: true });
    });
    document.addEventListener('click', (e) => {
        if (nav.classList.contains('is-open') && !nav.contains(e.target)) set(false);
    });
}

// ---------- 3. Hero face ----------------------------------------------------------------------------
const face = document.querySelector('[data-faces]');
if (face && !reduced) {
    const pics = [...face.querySelectorAll('img')];
    let i = 0, timer = null;
    const tick = () => {
        pics[i].classList.remove('is-on');
        i = (i + 1) % pics.length;
        pics[i].classList.add('is-on');
    };
    whileVisible(face, (on) => {
        clearInterval(timer);
        if (on && pics.length > 1) timer = setInterval(tick, 2500);
    });
}

// ---------- 4. Stack --------------------------------------------------------------------------------
const stack = document.querySelector('[data-stack]');
if (stack && !reduced) {
    const cards = [...stack.children];
    let queued = false;
    const update = () => {
        queued = false;
        cards.forEach((li, k) => {
            const next = cards[k + 1];
            if (!next) return;
            const a = li.getBoundingClientRect();
            const b = next.getBoundingClientRect();
            const p = Math.min(1, Math.max(0, 1 - (b.top - a.top) / a.height));
            li.firstElementChild.style.setProperty('--p', p.toFixed(3));
        });
    };
    const ask = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', ask, { passive: true });
    window.addEventListener('resize', ask);
    update();
}

// ---------- 5. Testimonials -------------------------------------------------------------------------
document.querySelectorAll('[data-quotes]').forEach((box) => {
    const tabs = [...box.querySelectorAll('[data-face]')];
    const quotes = [...box.querySelectorAll('[data-quote]')];
    const EVERY = 6000;
    let i = 0, timer = null, visible = false, hover = false, focused = false;
    const go = (n, { focus = false } = {}) => {
        i = (n + tabs.length) % tabs.length;
        tabs.forEach((t, k) => {
            t.setAttribute('aria-selected', String(k === i));
            t.tabIndex = k === i ? 0 : -1;
        });
        quotes.forEach((q, k) => { q.hidden = k !== i; });
        if (focus) tabs[i].focus();
        schedule();
    };
    const schedule = () => {
        clearTimeout(timer);
        if (reduced || !visible || hover || focused) return;
        timer = setTimeout(() => go(i + 1), EVERY);
    };
    tabs.forEach((t, k) => t.addEventListener('click', () => go(k)));
    box.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
        const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        go(to, { focus: true });
    });
    box.addEventListener('mouseenter', () => { hover = true; schedule(); });
    box.addEventListener('mouseleave', () => { hover = false; schedule(); });
    // Only keyboard focus pauses (a mouse click also focuses the button, which shouldn't stop autoplay forever).
    box.addEventListener('focusin', (e) => { focused = e.target.matches(':focus-visible'); schedule(); });
    box.addEventListener('focusout', () => { focused = false; schedule(); });
    whileVisible(box, (on) => { visible = on; schedule(); });
});

// ---------- 6. Legal popup --------------------------------------------------------------------------
document.querySelectorAll('[data-legal]').forEach((b) => b.addEventListener('click', () => {
    document.getElementById(`legal-${b.dataset.legal}`)?.showModal();
}));
document.querySelectorAll('dialog.legal').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

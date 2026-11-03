"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  BadgeCheck,
  ChevronDown,
  CircleQuestionMark,
  Info,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import Logo from "@/components/Logo";
import OrderModal from "@/components/OrderModal";
import ServiceIcon from "@/components/ServiceIcon";
import { PHONE_DISPLAY, PHONE_TEL, TELEGRAM_URL } from "@/lib/contacts";
import { services, type ServiceIconName } from "@/lib/services-data";

type MenuId = "services" | "company";

interface MenuItem {
  title: string;
  desc: string;
  href: string;
  icon: { service: ServiceIconName } | { lucide: LucideIcon };
}

interface AsideGroup {
  title: string;
  links: { name: string; href: string; external?: boolean }[];
}

interface MegaMenu {
  title: string;
  items: MenuItem[];
  aside: AsideGroup[];
}

const menus: Record<MenuId, MegaMenu> = {
  services: {
    title: "Услуги",
    items: services.map((s) => ({
      title: s.title,
      desc: s.short,
      href: `/services/${s.slug}`,
      icon: { service: s.icon },
    })),
    aside: [
      {
        title: "Полезное",
        links: [
          { name: "Цены", href: "/prices" },
          { name: "Калькулятор бюджета", href: "/calculator" },
          { name: "Гарантии", href: "/guarantees" },
          { name: "Частые вопросы", href: "/faq" },
        ],
      },
      {
        title: "Связаться",
        links: [
          { name: "Написать в Telegram", href: TELEGRAM_URL, external: true },
          { name: PHONE_DISPLAY, href: PHONE_TEL, external: true },
        ],
      },
    ],
  },
  company: {
    title: "Компания",
    items: [
      { title: "О нас", desc: "Чем занимаемся и как подходим к работе.", href: "/about", icon: { lucide: Info } },
      {
        title: "Гарантии",
        desc: "Что мы обещаем и чего обещать нельзя.",
        href: "/guarantees",
        icon: { lucide: BadgeCheck },
      },
      {
        title: "Частые вопросы",
        desc: "Про цены, сроки, отчёты и методы работы.",
        href: "/faq",
        icon: { lucide: CircleQuestionMark },
      },
    ],
    aside: [
      {
        title: "Документы",
        links: [
          { name: "Оферта", href: "/offer" },
          { name: "Политика конфиденциальности", href: "/privacy" },
        ],
      },
    ],
  },
};

type NavEntry = { kind: "menu"; id: MenuId; label: string } | { kind: "link"; href: string; label: string };

const nav: NavEntry[] = [
  { kind: "menu", id: "services", label: "Услуги" },
  { kind: "link", href: "/prices", label: "Цены" },
  { kind: "link", href: "/calculator", label: "Калькулятор" },
  { kind: "menu", id: "company", label: "Компания" },
  { kind: "link", href: "/contacts", label: "Контакты" },
];

function ItemIcon({ icon }: { icon: MenuItem["icon"] }) {
  if ("service" in icon) return <ServiceIcon name={icon.service} className="h-[18px] w-[18px]" />;
  const Icon = icon.lucide;
  return <Icon className="h-[18px] w-[18px]" aria-hidden="true" />;
}

function AsideLink({ link, onNavigate }: { link: AsideGroup["links"][number]; onNavigate: () => void }) {
  const className =
    "group inline-flex items-center gap-1 py-1.5 text-[15px] text-[var(--ink)] transition-colors hover:text-[var(--ink-muted)]";
  if (link.external) {
    const isWeb = link.href.startsWith("http");
    return (
      <a
        href={link.href}
        className={className}
        {...(isWeb ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        onClick={onNavigate}
      >
        {link.name}
        {isWeb && <ArrowUpRight className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />}
      </a>
    );
  }
  return (
    <Link href={link.href} className={className} onClick={onNavigate}>
      {link.name}
    </Link>
  );
}

export default function Header() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<MenuId | null>("services");
  const [orderOpen, setOrderOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRefs = useRef<Partial<Record<MenuId, HTMLButtonElement | null>>>({});

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenMenu(null), 160);
  };

  const closeAll = useCallback(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, []);

  // Close menus when the route changes (e.g. browser back): adjust state during render, not in an effect
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpenMenu(null);
    setMobileOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    const frame = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Escape closes the open menu and returns focus to its trigger
  useEffect(() => {
    if (!openMenu && !mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (openMenu) triggerRefs.current[openMenu]?.focus();
      closeAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openMenu, mobileOpen, closeAll]);

  // Lock page scroll under the mobile menu
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    const timer = closeTimer;
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const solid = scrolled || openMenu !== null || mobileOpen;
  const panel = openMenu ? menus[openMenu] : null;
  const fade = reduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.2, 0.7, 0.2, 1] as const };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const menuActive = (id: MenuId) => menus[id].items.some((i) => isActive(i.href));

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
            className="fixed inset-0 z-40 bg-[var(--ink)]/25 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4">
        <div className="relative mx-auto max-w-[1240px]" onMouseLeave={scheduleClose} onMouseEnter={cancelClose}>
          <div
            className={`flex h-16 items-center justify-between gap-4 rounded-2xl border pl-5 pr-2.5 transition-[background-color,border-color,box-shadow] duration-300 ${
              solid
                ? "border-[var(--border)] bg-white/95 shadow-[0_8px_30px_-12px_rgba(10,10,11,0.15)] backdrop-blur-md"
                : "border-[var(--border)] bg-white/75 backdrop-blur-md"
            }`}
          >
            <Link href="/" className="text-[var(--ink)]" aria-label="ratify, на главную">
              <Logo />
            </Link>

            <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Основное меню">
              {nav.map((entry) =>
                entry.kind === "menu" ? (
                  <button
                    key={entry.id}
                    ref={(el) => {
                      triggerRefs.current[entry.id] = el;
                    }}
                    type="button"
                    aria-expanded={openMenu === entry.id}
                    aria-controls="header-mega-panel"
                    onMouseEnter={() => {
                      cancelClose();
                      setOpenMenu(entry.id);
                    }}
                    onClick={() => setOpenMenu((cur) => (cur === entry.id ? null : entry.id))}
                    className={`inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-[15px] transition-colors ${
                      openMenu === entry.id
                        ? "bg-[var(--surface-muted)] text-[var(--ink)]"
                        : menuActive(entry.id)
                          ? "text-[var(--ink)]"
                          : "text-[var(--ink)] hover:bg-[var(--surface-muted)]"
                    }`}
                  >
                    {entry.label}
                    <ChevronDown
                      className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${
                        openMenu === entry.id ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    onMouseEnter={scheduleClose}
                    aria-current={isActive(entry.href) ? "page" : undefined}
                    className={`rounded-lg px-3.5 py-2 text-[15px] transition-colors hover:bg-[var(--surface-muted)] ${
                      isActive(entry.href) ? "text-[var(--ink)] underline decoration-1 underline-offset-[6px]" : "text-[var(--ink)]"
                    }`}
                  >
                    {entry.label}
                  </Link>
                )
              )}
            </nav>

            <div className="hidden items-center gap-2 lg:flex">
              <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
                Задать вопрос
              </a>
              <button type="button" onClick={() => setOrderOpen(true)} className="btn-primary btn-sm">
                Оставить заявку
              </button>
            </div>

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--ink)] transition-colors hover:bg-[var(--surface-muted)] lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-controls="header-mobile-menu"
              aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Desktop mega panel */}
          <AnimatePresence>
            {panel && (
              <motion.div
                id="header-mega-panel"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={fade}
                className="absolute inset-x-0 top-[calc(100%+8px)] hidden overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_24px_60px_-20px_rgba(10,10,11,0.25)] lg:block"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={openMenu}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.12 }}
                    className="grid grid-cols-[1fr_280px]"
                  >
                    <div className="p-7">
                      <p className="mb-4 text-sm text-[var(--ink-subtle)]">{panel.title}</p>
                      <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
                        {panel.items.map((item) => (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={closeAll}
                              className="group flex gap-3.5 rounded-xl p-3 transition-colors hover:bg-[var(--surface-muted)]"
                            >
                              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-[var(--ink)]">
                                <ItemIcon icon={item.icon} />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-[15px] font-medium text-[var(--ink)]">{item.title}</span>
                                <span className="mt-0.5 block text-sm leading-snug text-[var(--ink-muted)]">
                                  {item.desc}
                                </span>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="border-l border-[var(--border)] p-7">
                      {panel.aside.map((group) => (
                        <div key={group.title} className="mb-6 last:mb-0">
                          <p className="mb-2 text-sm text-[var(--ink-subtle)]">{group.title}</p>
                          <ul>
                            {group.links.map((link) => (
                              <li key={link.href}>
                                <AsideLink link={link} onNavigate={closeAll} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile menu */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                id="header-mobile-menu"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={fade}
                className="absolute inset-x-0 top-[calc(100%+8px)] flex max-h-[calc(100dvh-92px)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_24px_60px_-20px_rgba(10,10,11,0.25)] lg:hidden"
              >
                <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2">
                  {nav.map((entry) =>
                    entry.kind === "menu" ? (
                      <div key={entry.id} className="border-b border-[var(--border)] last:border-0">
                        <button
                          type="button"
                          onClick={() => setMobileSection((cur) => (cur === entry.id ? null : entry.id))}
                          aria-expanded={mobileSection === entry.id}
                          className="flex w-full items-center justify-between px-3 py-3.5 text-left text-base text-[var(--ink)]"
                        >
                          {entry.label}
                          <ChevronDown
                            className={`h-4 w-4 opacity-60 transition-transform ${
                              mobileSection === entry.id ? "rotate-180" : ""
                            }`}
                            aria-hidden="true"
                          />
                        </button>
                        {mobileSection === entry.id && (
                          <ul className="pb-2">
                            {menus[entry.id].items.map((item) => (
                              <li key={item.href}>
                                <Link
                                  href={item.href}
                                  onClick={closeAll}
                                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[var(--surface-muted)]"
                                >
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--ink)]">
                                    <ItemIcon icon={item.icon} />
                                  </span>
                                  <span className="text-[15px] text-[var(--ink)]">{item.title}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <Link
                        key={entry.href}
                        href={entry.href}
                        onClick={closeAll}
                        className="block border-b border-[var(--border)] px-3 py-3.5 text-base text-[var(--ink)] last:border-0"
                      >
                        {entry.label}
                      </Link>
                    )
                  )}
                </div>
                <div className="grid gap-2 border-t border-[var(--border)] p-3 min-[420px]:grid-cols-2">
                  <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                    Задать вопрос
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      setOrderOpen(true);
                    }}
                    className="btn-primary"
                  >
                    Оставить заявку
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <OrderModal isOpen={orderOpen} onClose={() => setOrderOpen(false)} />
    </>
  );
}

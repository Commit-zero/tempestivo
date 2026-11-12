import {
  CalendarClock, CircleDollarSign, FolderOpen, Gavel, LayoutDashboard, ListTodo, Settings, Users,
  type LucideIcon,
} from "lucide-react";

// Dados da navegação fora do módulo "use client": a página "Mais" é um Server
// Component e precisa da lista de verdade, não de uma referência de cliente.
export type ItemDeNavegacao = { href: string; rotulo: string; icone: LucideIcon };

export const PRINCIPAIS: ItemDeNavegacao[] = [
  { href: "/painel", rotulo: "Painel", icone: LayoutDashboard },
  { href: "/prazos", rotulo: "Prazos", icone: CalendarClock },
  { href: "/processos", rotulo: "Processos", icone: FolderOpen },
  { href: "/honorarios", rotulo: "Honorários", icone: CircleDollarSign },
];

export const SECUNDARIOS: ItemDeNavegacao[] = [
  { href: "/clientes", rotulo: "Clientes", icone: Users },
  { href: "/audiencias", rotulo: "Audiências", icone: Gavel },
  { href: "/tarefas", rotulo: "Tarefas", icone: ListTodo },
  { href: "/conta", rotulo: "Conta", icone: Settings },
];

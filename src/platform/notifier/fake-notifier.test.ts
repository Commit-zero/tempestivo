import { describe, expect, it } from "vitest";
import { criarFakeNotifier } from "./fake-notifier";
import { criarNotifier } from "./index";

const notificacao = {
  contaId: "conta-1",
  usuarioId: "usuario-1",
  titulo: "Prazo amanhã",
  corpo: "Contestação do processo fictício vence amanhã.",
};

describe("fake notifier", () => {
  it("notificar guarda a notificação", async () => {
    const notifier = criarFakeNotifier();
    await notifier.notificar(notificacao);
    expect(notifier.notificadas).toEqual([notificacao]);
  });

  it.each(["contaId", "usuarioId"] as const)("%s vazio lança erro e não guarda", async (campo) => {
    const notifier = criarFakeNotifier();
    await expect(notifier.notificar({ ...notificacao, [campo]: " " })).rejects.toThrow();
    expect(notifier.notificadas).toHaveLength(0);
  });
});

describe("criarNotifier", () => {
  it("devolve o fake com NOTIFIER_DRIVER=fake", () => {
    expect(criarNotifier({ NOTIFIER_DRIVER: "fake" })).toHaveProperty("notificadas");
  });
});

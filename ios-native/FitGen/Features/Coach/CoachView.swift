import SwiftUI

struct CoachView: View {
    init() {}

    @Environment(\.dismiss) private var dismiss
    @Environment(AppStore.self) private var store
    @State private var model = CoachModel()
    @State private var input = ""
    @State private var confirmClear = false
    @FocusState private var focused: Bool

    private let suggestions = [
        "Monte um treino rápido de 20 min",
        "O que comer antes do treino?",
        "Como está minha semana?",
        "Troque um exercício do treino de hoje",
    ]

    private var canSend: Bool {
        !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !model.isSending
    }

    var body: some View {
        NavigationStack {
            Group {
                if model.premiumRequired {
                    ScrollView { PremiumCard() }
                } else if model.isLoading {
                    LoadingView()
                } else if let error = model.loadError, model.messages.isEmpty {
                    VStack(spacing: 12) {
                        Text(error).foregroundStyle(Theme.secondary).multilineTextAlignment(.center)
                        Button("Tentar novamente") { Task { await model.load() } }.tint(Theme.voltText)
                    }
                    .padding().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if model.messages.isEmpty && !model.isSending {
                    emptyState
                } else {
                    messageList
                }
            }
            .screen()
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if !model.premiumRequired { composer }
            }
            .navigationTitle("Otto")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button { dismiss() } label: { Image(systemName: "xmark") }
                        .accessibilityLabel("Fechar")
                }
                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Button("Limpar conversa", systemImage: "trash", role: .destructive) { confirmClear = true }
                            .disabled(model.messages.isEmpty || model.isSending)
                    } label: { Image(systemName: "ellipsis.circle") }
                    .accessibilityLabel("Mais opções")
                }
            }
            .confirmationDialog("Limpar todo o histórico de conversas?", isPresented: $confirmClear, titleVisibility: .visible) {
                Button("Limpar conversa", role: .destructive) { Task { await model.clear() } }
                Button("Cancelar", role: .cancel) {}
            }
            .alert("Não foi possível concluir", isPresented: Binding(get: { model.lastError != nil && !hasFailedMessage }, set: { if !$0 { model.lastError = nil } })) {
                Button("OK") { model.lastError = nil }
            } message: { Text(model.lastError ?? "") }
        }
        .task { await model.load() }
    }

    private var hasFailedMessage: Bool { model.messages.contains { $0.failed } }

    // MARK: Empty state

    private var emptyState: some View {
        ScrollView {
            VStack(spacing: 16) {
                OttoAvatarView(size: 96).padding(.top, 40)
                Text(greeting).font(.system(.title2, design: .rounded).weight(.bold)).foregroundStyle(.primary)
                    .multilineTextAlignment(.center)
                Text("Como posso te ajudar hoje?").foregroundStyle(Theme.secondary)
                VStack(spacing: 10) {
                    ForEach(suggestions, id: \.self) { s in
                        Button { Task { await model.send(s) } } label: {
                            HStack {
                                Text(s).foregroundStyle(.primary).multilineTextAlignment(.leading)
                                Spacer()
                                Image(systemName: "arrow.up.right").foregroundStyle(Theme.voltText)
                            }
                            .padding(.horizontal, 16).padding(.vertical, 14)
                            .background(Theme.card, in: Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.top, 12)
            }
            .padding(.horizontal, Theme.gutter)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private var greeting: String {
        if let name = store.profile.value?.firstName, !name.isEmpty { return "Oi, \(name)! Eu sou o Otto." }
        return "Oi! Eu sou o Otto."
    }

    // MARK: Messages

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(Array(model.messages.enumerated()), id: \.element.id) { index, message in
                        if index == 0 || !Calendar.current.isDate(message.date, inSameDayAs: model.messages[index - 1].date) {
                            Text(dayLabel(message.date))
                                .font(.caption.weight(.semibold)).foregroundStyle(Theme.secondary)
                                .padding(.top, 10)
                        }
                        MessageRow(message: message, retry: { Task { await model.retry(message) } }, error: message.failed ? model.lastError : nil)
                    }
                    if model.isSending {
                        HStack(alignment: .bottom, spacing: 8) {
                            OttoAvatarView(size: 28)
                            TypingIndicator()
                            Spacer(minLength: 40)
                        }
                        .id("typing")
                    }
                    Color.clear.frame(height: 1).id("bottom")
                }
                .padding(.horizontal, Theme.gutter).padding(.vertical, 12)
            }
            .scrollDismissesKeyboard(.interactively)
            .defaultScrollAnchor(.bottom)
            .onChange(of: model.messages.count) { scrollToBottom(proxy) }
            .onChange(of: model.isSending) { scrollToBottom(proxy) }
            .onChange(of: focused) { if focused { scrollToBottom(proxy) } }
        }
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        withAnimation(.easeOut(duration: 0.25)) { proxy.scrollTo("bottom", anchor: .bottom) }
    }

    private func dayLabel(_ date: Date) -> String {
        "\(Format.relativeDay(date)), \(date.formatted(.dateTime.hour().minute().locale(Locale(identifier: "pt_BR"))))"
    }

    // MARK: Composer

    private var composer: some View {
        HStack(alignment: .bottom, spacing: 8) {
            TextField("Pergunte sobre treino ou dieta…", text: $input, axis: .vertical)
                .lineLimit(1...5)
                .focused($focused)
                .padding(.horizontal, 16).padding(.vertical, 10)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                .accessibilityLabel("Mensagem para o Otto")
            Button(action: submit) {
                Image(systemName: "arrow.up.circle.fill").font(.system(size: 36))
                    .foregroundStyle(canSend ? Theme.voltText : Theme.cardRaised)
            }
            .disabled(!canSend)
            .accessibilityLabel("Enviar mensagem")
        }
        .padding(.horizontal, Theme.gutter).padding(.vertical, 8)
        .background(Theme.background)
    }

    private func submit() {
        let text = input
        input = ""
        Task { await model.send(text) }
    }
}

private struct MessageRow: View {
    let message: CoachMessage
    let retry: () -> Void
    let error: String?

    var body: some View {
        let mine = message.role == .user
        VStack(alignment: mine ? .trailing : .leading, spacing: 4) {
            HStack(alignment: .bottom, spacing: 8) {
                if mine { Spacer(minLength: 48) } else { OttoAvatarView(size: 28) }
                bubble(mine)
                if !mine { Spacer(minLength: 24) }
            }
            if message.failed {
                HStack(spacing: 6) {
                    Image(systemName: "exclamationmark.circle.fill").foregroundStyle(Theme.calories)
                    Text(error ?? "Não foi possível enviar.").lineLimit(2)
                    Button("Tentar de novo", action: retry).fontWeight(.semibold).foregroundStyle(Theme.voltText)
                }
                .font(.caption).foregroundStyle(Theme.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: mine ? .trailing : .leading)
    }

    @ViewBuilder private func bubble(_ mine: Bool) -> some View {
        Group {
            if mine {
                Text(message.text).foregroundStyle(.black)
            } else {
                MarkdownText(text: message.text)
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 10)
        .background(mine ? Theme.volt : Theme.card,
                    in: UnevenRoundedRectangle(topLeadingRadius: 20, bottomLeadingRadius: mine ? 20 : 6,
                                               bottomTrailingRadius: mine ? 6 : 20, topTrailingRadius: 20, style: .continuous))
        .contextMenu {
            Button("Copiar", systemImage: "doc.on.doc") { UIPasteboard.general.string = message.text }
        }
    }
}

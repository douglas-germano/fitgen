import SwiftUI
import UIKit

/// Club options for admins: details, photo, invite code, members and danger zone.
struct GroupSettingsView: View {
    let groupId: String

    @Environment(CommunityStore.self) private var community
    @Environment(\.dismiss) private var dismiss
    @State private var detail: GroupDetail?
    @State private var loadError: String?
    @State private var name = ""
    @State private var about = ""
    @State private var isPublic = false
    @State private var seeded = false
    @State private var saving = false
    @State private var photoBusy = false
    @State private var rotating = false
    @State private var confirmRotate = false
    @State private var confirmPhotoRemoval = false
    @State private var confirmDelete = false
    @State private var confirmLeave = false
    @State private var memberToRemove: GroupMemberStats?
    @State private var copied = false
    @State private var alert: String?

    var body: some View {
        Group {
            if let detail {
                if detail.group.isAdmin { form(detail) } else {
                    ScrollView {
                        SocialRows { Label("Somente administradores podem gerenciar este clube.", systemImage: "shield.fill").padding(16) }
                            .padding(Theme.gutter)
                    }
                }
            } else if let loadError {
                ScrollView { ErrorCard(message: loadError) { Task { await load() } }.padding(Theme.gutter) }
            } else {
                LoadingView()
            }
        }
        .screen()
        .navigationTitle("Opções do clube")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: community.groupsVersion) { await load() }
        .socialAlert("Não foi possível concluir", message: $alert)
        .confirmationDialog("Invalidar o convite antigo?", isPresented: $confirmRotate, titleVisibility: .visible) {
            Button("Gerar novo código", role: .destructive) { Task { await rotate() } }
            Button("Cancelar", role: .cancel) {}
        } message: { Text("O código antigo deixa de funcionar.") }
        .confirmationDialog("Remover a foto do clube?", isPresented: $confirmPhotoRemoval, titleVisibility: .visible) {
            Button("Remover foto", role: .destructive) { Task { await setPhoto(nil) } }
            Button("Cancelar", role: .cancel) {}
        }
        .confirmationDialog("Excluir clube e suas publicações?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Excluir clube", role: .destructive) { Task { await deleteGroup() } }
            Button("Cancelar", role: .cancel) {}
        } message: { Text("Essa ação não pode ser desfeita.") }
        .confirmationDialog("Sair do clube?", isPresented: $confirmLeave, titleVisibility: .visible) {
            Button("Sair do clube", role: .destructive) { Task { await leave() } }
            Button("Cancelar", role: .cancel) {}
        }
        .confirmationDialog(memberToRemove.map { "Remover \($0.user.name)?" } ?? "",
                            isPresented: Binding(get: { memberToRemove != nil }, set: { if !$0 { memberToRemove = nil } }),
                            titleVisibility: .visible) {
            if let member = memberToRemove {
                Button("Remover do clube", role: .destructive) { Task { await remove(member) } }
            }
            Button("Cancelar", role: .cancel) {}
        }
    }

    // MARK: Form

    private func form(_ detail: GroupDetail) -> some View {
        let group = detail.group
        return ScrollView {
            VStack(spacing: 20) {
                ClubPhotoControl(groupId: group.id, hasPhoto: group.hasPhoto, busy: photoBusy,
                                 onPick: { data in Task { await setPhoto(data) } },
                                 onRemove: { confirmPhotoRemoval = true })
                    .padding(.top, 8)

                VStack(spacing: 14) {
                    SocialField(title: "Nome do clube", text: $name, limit: 60)
                    SocialField(title: "Descrição (opcional)", text: $about, prompt: "Conte do que se trata o clube", axis: .vertical, limit: 280)
                    ClubVisibilityPicker(isPublic: $isPublic)
                    Button { Task { await save(group) } } label: {
                        if saving { ProgressView() } else { Text("Salvar alterações") }
                    }
                    .buttonStyle(.fitgenPrimary)
                    .disabled(saving || !changed(group))
                }

                inviteSection(group)
                membersSection(detail)

                SocialRows {
                    Button { confirmLeave = true } label: {
                        Label("Sair do clube", systemImage: "rectangle.portrait.and.arrow.right").padding(16)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                    Button(role: .destructive) { confirmDelete = true } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Label("Excluir clube", systemImage: "trash")
                            Text("Apaga o clube e todas as publicações").font(.footnote).foregroundStyle(Theme.secondary)
                        }
                        .padding(16).frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.bottom, 32)
        }
        .scrollDismissesKeyboard(.interactively)
        .refreshable { await load() }
    }

    private func changed(_ group: CommunityGroup) -> Bool {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmed.isEmpty && (trimmed != group.name || about != (group.description ?? "") || isPublic != group.isPublic)
    }

    private func inviteSection(_ group: CommunityGroup) -> some View {
        SocialRows(title: "Convite") {
            if let code = group.inviteCode, !code.isEmpty {
                HStack(spacing: 8) {
                    Text(code).font(.system(size: 22, weight: .bold, design: .monospaced)).textSelection(.enabled)
                    Spacer()
                    Button {
                        UIPasteboard.general.string = code
                        copied = true
                        Task { try? await Task.sleep(for: .seconds(2)); copied = false }
                    } label: { Label(copied ? "Copiado" : "Copiar", systemImage: copied ? "checkmark" : "doc.on.doc") }
                        .buttonStyle(SocialPillStyle())
                    ShareLink(item: CommunityFormat.inviteMessage(groupName: group.name, code: code)) {
                        Label("Enviar", systemImage: "square.and.arrow.up")
                    }
                    .buttonStyle(SocialPillStyle(filled: true))
                }
                .padding(16)
            }
            Button { confirmRotate = true } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Label("Trocar código de convite", systemImage: "arrow.triangle.2.circlepath")
                        Text("O código antigo deixa de funcionar").font(.footnote).foregroundStyle(Theme.secondary)
                    }
                    Spacer()
                    if rotating { ProgressView() }
                }
                .padding(16).frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(rotating)
        }
    }

    private func membersSection(_ detail: GroupDetail) -> some View {
        SocialRows(title: "Membros") {
            ForEach(detail.members.filter { !$0.blocked }) { member in
                SocialPersonRow(user: member.user, caption: caption(member)) {
                    if !member.isMe {
                        Menu {
                            Button { Task { await setRole(member, member.role == .admin ? .member : .admin) } } label: {
                                Label(member.role == .admin ? "Tornar membro" : "Tornar admin", systemImage: "shield")
                            }
                            Button(role: .destructive) { memberToRemove = member } label: {
                                Label("Remover do clube", systemImage: "person.badge.minus")
                            }
                        } label: {
                            Image(systemName: "ellipsis.circle").font(.title3).foregroundStyle(Theme.secondary).frame(width: 32, height: 32)
                        }
                        .accessibilityLabel("Gerenciar \(member.user.name)")
                    }
                }
            }
        }
    }

    private func caption(_ member: GroupMemberStats) -> String {
        "\(member.role == .admin ? "Admin" : "Membro") · \(member.workouts) \(member.workouts == 1 ? "treino" : "treinos") · \(member.activeDays) dias ativos"
    }

    // MARK: Actions

    private func load() async {
        do {
            let loaded = try await community.group(id: groupId)
            detail = loaded
            loadError = nil
            if !seeded {
                seeded = true
                name = loaded.group.name; about = loaded.group.description ?? ""; isPublic = loaded.group.isPublic
            }
        } catch {
            if Task.isCancelled || (error as? URLError)?.code == .cancelled { return }
            if detail == nil { loadError = error.localizedDescription }
        }
    }

    private func save(_ group: CommunityGroup) async {
        saving = true
        defer { saving = false }
        do {
            let updated = try await community.updateGroup(id: groupId, name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                                                          description: about, isPublic: isPublic)
            name = updated.name; about = updated.description ?? ""; isPublic = updated.isPublic
        } catch { alert = error.localizedDescription }
    }

    private func setPhoto(_ data: Data?) async {
        photoBusy = true
        defer { photoBusy = false }
        do { _ = try await community.setGroupPhoto(groupId: groupId, photo: data) } catch { alert = error.localizedDescription }
    }

    private func rotate() async {
        rotating = true
        defer { rotating = false }
        do { _ = try await community.rotateInviteCode(groupId: groupId) } catch { alert = error.localizedDescription }
    }

    private func setRole(_ member: GroupMemberStats, _ role: GroupRole) async {
        do { try await community.setMemberRole(groupId: groupId, userId: member.id, role: role) } catch { alert = error.localizedDescription }
    }

    private func remove(_ member: GroupMemberStats) async {
        do { try await community.removeMember(groupId: groupId, userId: member.id) } catch { alert = error.localizedDescription }
    }

    private func leave() async {
        do { try await community.leaveGroup(id: groupId); dismiss() } catch { alert = error.localizedDescription }
    }

    private func deleteGroup() async {
        do { try await community.deleteGroup(id: groupId); dismiss() } catch { alert = error.localizedDescription }
    }
}

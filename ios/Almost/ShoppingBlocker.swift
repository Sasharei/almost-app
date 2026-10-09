import Foundation
import React
import FamilyControls
import ManagedSettings
import DeviceActivity
import SwiftUI

@objc(ShoppingBlocker)
class ShoppingBlocker: NSObject {
  private var draft: FamilyActivitySelection?
  private var presenting = false
  private let passQueue = DispatchQueue(label: "almost.shopping.pass.operations")
  @objc static func requiresMainQueueSetup() -> Bool { true }
  @objc var methodQueue: DispatchQueue { DispatchQueue.main }

  private func run(_ resolve: RCTPromiseResolveBlock, _ reject: RCTPromiseRejectBlock,
                   _ body: () throws -> [String: Any]) {
    guard #available(iOS 16.0, *) else { resolve(["supported": false]); return }
    do { resolve(try body()) } catch { reject("blockError", "Screen Time operation failed", error) }
  }

  @objc func status(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    run(resolve, reject) {
      if #available(iOS 16.0, *) {
        return try ShoppingBlockerStore.transaction { state in
          ShoppingBlockerStore.apply(&state)
          return ShoppingBlockerStore.status(state)
        }
      }
      return ["supported": false]
    }
  }

  @objc func authorize(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 16.0, *) else { resolve(["supported": false]); return }
    Task { @MainActor in
      do {
        // An already approved authorization does not invalidate durable tokens.
        if AuthorizationCenter.shared.authorizationStatus != .approved {
          try ShoppingBlockerStore.transaction { state in
            ShoppingBlockerStore.apply(&state)
          }
          try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        }
        self.status(resolve, rejecter: reject)
      } catch { reject("blockPermissionError", "Screen Time authorization failed", error) }
    }
  }

  @objc func selectApps(_ copy: [String: String], resolver resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 16.0, *) else { resolve(["supported": false]); return }
    guard !presenting, let presenter = RCTPresentedViewController() else {
      reject("blockError", "Screen unavailable", nil); return
    }
    presenting = true
    let initialSelection: FamilyActivitySelection
    do {
      initialSelection = try ShoppingBlockerStore.transaction { state in
        ShoppingBlockerStore.apply(&state)
        var pickerSelection = FamilyActivitySelection(includeEntireCategory: true)
        if !state.needsSelection { pickerSelection.applicationTokens = state.selection.applicationTokens }
        return pickerSelection
      }
    } catch {
      presenting = false
      reject("blockError", "Selection unavailable", error); return
    }
    let controller = UIHostingController(rootView: ShoppingAppPicker(copy: copy, initialSelection: initialSelection) { [weak self] selection in
      presenter.dismiss(animated: true) {
        self?.presenting = false
        guard let selection else { resolve(["cancelled": true]); return }
        guard !selection.applicationTokens.isEmpty else {
          reject("blockSelectionError", "Choose individual applications", nil); return
        }
        // Apple may return category tokens alongside the selected apps. Expand
        // categories in the picker, then persist apps only so a pass still
        // unlocks exactly one app. Websites never enter this restriction store.
        var apps = FamilyActivitySelection()
        apps.applicationTokens = selection.applicationTokens
        self?.run(resolve, reject) {
          try ShoppingBlockerStore.transaction { state in
            state.selection = apps
            state.needsSelection = false
            self?.draft = apps
            ShoppingBlockerStore.apply(&state)
            return ShoppingBlockerStore.status(state)
          }
        }
      }
    }.environment(\.locale, Locale(identifier: copy["locale"] ?? "en")))
    controller.isModalInPresentation = true
    presenter.present(controller, animated: true)
  }

  private func savings(_ events: [[String: Any]]) -> [ShoppingSaving] {
    var seen: Set<String> = []
    return events.compactMap { event in
      guard let id = event["id"] as? String, !id.isEmpty,
            let timestamp = event["timestamp"] as? Double,
            let amount = event["amountUSD"] as? Double,
            timestamp.isFinite, amount.isFinite, amount > 0, amount <= 1e9,
            timestamp > 0, timestamp <= Date().timeIntervalSince1970 * 1000,
            seen.insert(id).inserted else { return nil }
      return ShoppingSaving(id: id, timestamp: timestamp, amountUSD: amount)
    }
  }

  @objc func start(_ goalUSD: Double, currency: String, goalAmount: Double, events: [[String: Any]], copy: [String: String],
                   resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    run(resolve, reject) {
      guard #available(iOS 16.0, *) else { return ["supported": false] }
      guard goalUSD.isFinite, goalUSD >= 0.01, goalUSD <= 1e9,
            goalAmount.isFinite, goalAmount > 0, currency.count == 3,
            AuthorizationCenter.shared.authorizationStatus == .approved else {
        throw NSError(domain: "ShoppingBlocker", code: 4)
      }
      let result = try ShoppingBlockerStore.transaction { state in
        guard !state.active else { throw NSError(domain: "ShoppingBlocker", code: 5) }
        ShoppingBlockerStore.apply(&state)
        let selection = draft ?? state.selection
        guard !selection.applicationTokens.isEmpty, !state.needsSelection else {
          throw NSError(domain: "ShoppingBlocker", code: 4)
        }
        state = ShoppingBlockerState()
        state.active = true; state.selection = selection; state.goalUSD = goalUSD
        state.goalAmount = goalAmount; state.goalCurrency = currency
        state.startedAt = ShoppingBlockerStore.now; state.lastGoalChangeAt = state.startedAt; state.events = savings(events)
        state.excludedIds = Set(state.events.map(\.id)); state.copy = copy
        ShoppingBlockerStore.apply(&state)
        return ShoppingBlockerStore.status(state)
      }
      draft = nil
      return result
    }
  }

  @objc func updateGoal(_ goalUSD: Double, currency: String, goalAmount: Double,
                        resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    run(resolve, reject) {
      guard #available(iOS 16.0, *) else { return ["supported": false] }
      return try ShoppingBlockerStore.transaction { state in
        try state.updateGoal(goalUSD, amount: goalAmount, currency: currency, now: ShoppingBlockerStore.now)
        ShoppingBlockerStore.apply(&state)
        return ShoppingBlockerStore.status(state)
      }
    }
  }

  @objc func sync(_ events: [[String: Any]], copy: [String: String], resolver resolve: RCTPromiseResolveBlock,
                  rejecter reject: RCTPromiseRejectBlock) {
    run(resolve, reject) {
      guard #available(iOS 16.0, *) else { return ["supported": false] }
      return try ShoppingBlockerStore.transaction { state in
        state.events = savings(events); state.copy = copy
        ShoppingBlockerStore.apply(&state)
        return ShoppingBlockerStore.status(state)
      }
    }
  }

  @objc func unlock(_ copy: [String: String], resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 16.0, *) else { resolve(["supported": false]); return }
    do {
      let state = try ShoppingBlockerStore.transaction { state -> ShoppingBlockerState in
        ShoppingBlockerStore.apply(&state)
        return state
      }
      guard state.ready, !state.needsSelection,
            state.unlockUntil == 0, AuthorizationCenter.shared.authorizationStatus == .approved,
            !presenting, let presenter = RCTPresentedViewController() else {
        reject("blockError", "Pass unavailable", nil); return
      }
      presenting = true
      let controller = UIHostingController(rootView: ShoppingUnlockPicker(
        tokens: Array(state.selection.applicationTokens), copy: copy
      ) { [weak self] token in
        presenter.dismiss(animated: true) {
          self?.presenting = false
          guard let token else { resolve(["cancelled": true]); return }
          self?.grantPass(token, resolve: resolve, reject: reject)
        }
      }.environment(\.locale, Locale(identifier: copy["locale"] ?? "en")))
      controller.isModalInPresentation = true
      presenter.present(controller, animated: true)
    } catch { reject("blockError", "Pass unavailable", error) }
  }

  @available(iOS 16.0, *)
  private func grantPass(_ token: ApplicationToken, resolve: @escaping RCTPromiseResolveBlock,
                         reject: @escaping RCTPromiseRejectBlock) {
    // DeviceActivity can synchronously call the monitor extension. Never hold
    // the shared file lock during its IPC, or block the UI thread waiting on it.
    passQueue.async {
      var registered = false
      do {
        try ShoppingBlockerStore.transaction { current in
          ShoppingBlockerStore.apply(&current)
          try self.validatePass(current, token: token)
        }
        let start = Date()
        let end = ShoppingSavings.passDeadline(from: start)
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let components: Set<Calendar.Component> = [.calendar, .timeZone, .year, .month, .day, .hour, .minute, .second]
        let schedule = DeviceActivitySchedule(
          intervalStart: calendar.dateComponents(components, from: start),
          intervalEnd: calendar.dateComponents(components, from: end), repeats: false)
        // Failure preserves the earned pass and all blocks.
        try DeviceActivityCenter().startMonitoring(ShoppingBlockerStore.activity, during: schedule)
        registered = true
        let result = try ShoppingBlockerStore.transaction { current in
          try self.validatePass(current, token: token)
          // A slow system response must not grant an already expired pass.
          guard end.timeIntervalSinceNow > 0 else { throw NSError(domain: "ShoppingBlocker", code: 6) }
          current.unlocked = token; current.unlockUntil = end.timeIntervalSince1970 * 1000
          current.awaitingNextGoal = true
          current.startedAt = ShoppingBlockerStore.now
          current.excludedIds.formUnion(current.events.map(\.id))
          ShoppingBlockerStore.apply(&current)
          return ShoppingBlockerStore.status(current)
        }
        resolve(result)
      } catch {
        if registered { DeviceActivityCenter().stopMonitoring([ShoppingBlockerStore.activity]) }
        reject("blockError", "Pass unavailable", error)
      }
    }
  }

  @available(iOS 16.0, *)
  private func validatePass(_ current: ShoppingBlockerState, token: ApplicationToken) throws {
    guard current.ready, !current.needsSelection, current.unlockUntil == 0,
          current.selection.applicationTokens.contains(token),
          AuthorizationCenter.shared.authorizationStatus == .approved else {
      throw NSError(domain: "ShoppingBlocker", code: 6)
    }
  }

  @objc func stop(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    run(resolve, reject) {
      guard #available(iOS 16.0, *) else { return ["supported": false] }
      let result = try ShoppingBlockerStore.transaction { state in
        let selection = state.selection
        let needsSelection = state.needsSelection
        state = ShoppingBlockerState()
        state.selection = selection
        state.needsSelection = needsSelection
        ShoppingBlockerStore.apply(&state)
        return ShoppingBlockerStore.status(state)
      }
      // Stopping monitoring can also invoke the extension: release the lock first.
      DeviceActivityCenter().stopMonitoring([ShoppingBlockerStore.activity])
      return result
    }
  }
}

@available(iOS 16.0, *)
private struct ShoppingAppPicker: View {
  let copy: [String: String]
  let completion: (FamilyActivitySelection?) -> Void
  @State private var selection: FamilyActivitySelection
  init(copy: [String: String], initialSelection: FamilyActivitySelection,
       completion: @escaping (FamilyActivitySelection?) -> Void) {
    self.copy = copy
    self.completion = completion
    _selection = State(initialValue: initialSelection)
  }
  var body: some View {
    NavigationStack {
      FamilyActivityPicker(headerText: copy["blockPickerHint"], selection: $selection)
        .tint(.primary)
        .navigationTitle(copy["blockSelectApps"] ?? "")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) { Button(copy["blockCancel"] ?? "") { completion(nil) } }
          ToolbarItem(placement: .confirmationAction) {
            Button(copy["blockContinue"] ?? "") { completion(selection) }
              .disabled(selection.applicationTokens.isEmpty)
          }
        }
    }
  }
}

@available(iOS 16.0, *)
private struct ShoppingUnlockPicker: View {
  let tokens: [ApplicationToken]
  let copy: [String: String]
  let completion: (ApplicationToken?) -> Void
  @State private var chosen: ApplicationToken?
  var body: some View {
    NavigationStack {
      List {
        Text(copy["blockPassHint"] ?? "").foregroundStyle(.secondary)
        ForEach(tokens, id: \.self) { token in
          Button { chosen = token } label: {
            HStack { Label(token); Spacer(); if chosen == token { Image(systemName: "checkmark.circle.fill") } }
              .frame(minHeight: 44)
          }.accessibilityAddTraits(chosen == token ? .isSelected : [])
        }
      }
      .navigationTitle(copy["blockChooseStore"] ?? "")
      .tint(.primary)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button(copy["blockCancel"] ?? "") { completion(nil) } }
        ToolbarItem(placement: .confirmationAction) {
          Button(copy["blockUnlock"] ?? "") { completion(chosen) }.disabled(chosen == nil)
        }
      }
    }
  }
}

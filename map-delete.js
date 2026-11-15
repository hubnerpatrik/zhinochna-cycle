// Deleting a map is not confirmed up front; it is done and can be undone for a while instead.
export function deleteMapWithUndo(mapId, { store, runStoreAction, offerUndo, notify, refresh }) {
  const snapshot = store.snapshotMap(mapId);
  const deleted = runStoreAction(() => store.deleteMap(mapId));
  if (!deleted.ok || !deleted.value) return false;
  refresh();
  offerUndo('Map deleted', {
    label: 'Undo',
    onAction: () => {
      const restored = runStoreAction(() => store.restoreMap(snapshot));
      if (!restored.ok || !restored.value) return;
      notify('Map restored ✓');
      refresh();
    },
  });
  return true;
}

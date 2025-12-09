// =============================================================
// src/components/DartSetsPanel.tsx
// Panneau "Mes fléchettes" pour un profil
// - Header néon + bouton "CRÉER"
// - Carrousel horizontal avec une carte par set
// - Barre d'actions globale (Scanner / Editer / Suppr / Favori)
// - Création et édition en blocs flottants
// - Scanner (sheet) pour associer des visuels
// =============================================================

import React from "react";
import type { Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import DartSetScannerSheet from "./DartSetScannerSheet";

import {
  type DartSet,
  getDartSetsForProfile,
  createDartSet,
  deleteDartSet,
  setFavoriteDartSet,
  updateDartSet,
} from "../lib/dartSetsStore";

type Props = {
  profile: Profile;
};

type FormState = {
  name: string;
  brand: string;
  weightGrams: string;
  notes: string;
  bgColor: string;
  scope: "private" | "public";
};

const DEFAULT_BG = "#101020";

const createEmptyForm = (primary: string): FormState => ({
  name: "",
  brand: "",
  weightGrams: "",
  notes: "",
  bgColor: primary || DEFAULT_BG,
  scope: "private",
});

const DartSetsPanel: React.FC<Props> = ({ profile }) => {
  const { palette } = useTheme();
  const { lang } = useLang();

  const primary = palette?.primary || "#f5c35b";

  const [sets, setSets] = React.useState<DartSet[]>([]);
  const [form, setForm] = React.useState<FormState>(createEmptyForm(primary));
  const [isCreating, setIsCreating] = React.useState(false);

  // Edition
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<FormState | null>(null);

  // Scanner
  const [scannerTarget, setScannerTarget] = React.useState<DartSet | null>(null);

  // Carrousel
  const [activeIndex, setActiveIndex] = React.useState(0);

  // Chargement initial
  React.useEffect(() => {
    if (!profile?.id) return;
    const all = getDartSetsForProfile(profile.id);
    const sorted = sortSets(all);
    setSets(sorted);
    setActiveIndex((idx) =>
      sorted.length === 0 ? 0 : Math.min(idx, sorted.length - 1)
    );
  }, [profile?.id]);

  const hasSets = sets.length > 0;
  const activeSet: DartSet | null =
    hasSets && activeIndex >= 0 && activeIndex < sets.length
      ? sets[activeIndex]
      : null;

  function sortSets(list: DartSet[]): DartSet[] {
    return list
      .slice()
      .sort((a, b) => {
        const favA = a.isFavorite ? 1 : 0;
        const favB = b.isFavorite ? 1 : 0;
        if (favA !== favB) return favB - favA;
        const luA = a.lastUsedAt || 0;
        const luB = b.lastUsedAt || 0;
        return luB - luA;
      });
  }

  const reloadSets = () => {
    if (!profile?.id) return;
    const updated = sortSets(getDartSetsForProfile(profile.id));
    setSets(updated);
    setActiveIndex((idx) =>
      updated.length === 0 ? 0 : Math.min(idx, updated.length - 1)
    );
  };

  // ------------------------------------------------------------------
  // Handlers formulaires
  // ------------------------------------------------------------------

  const handleChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleEditChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    const name = form.name.trim() || "Mes fléchettes";
    const brand = form.brand.trim();
    const notes = form.notes.trim();
    const weight = parseInt(form.weightGrams, 10);
    const weightGrams = Number.isFinite(weight) ? weight : undefined;
    const scope = form.scope;

    try {
      createDartSet({
        profileId: profile.id,
        name,
        brand: brand || undefined,
        weightGrams,
        notes: notes || undefined,
        mainImageUrl: "", // sera rempli par le scanner
        thumbImageUrl: undefined,
        bgColor: form.bgColor || DEFAULT_BG,
        scope,
      });

      reloadSets();
      setForm(createEmptyForm(primary));
      setIsCreating(false);
    } catch (err) {
      console.warn("[DartSetsPanel] create error", err);
    }
  };

  const handleStartEdit = (set: DartSet | null) => {
    if (!set) return;
    setIsCreating(false);
    setEditingId(set.id);
    setEditForm({
      name: set.name || "",
      brand: set.brand || "",
      weightGrams: set.weightGrams ? String(set.weightGrams) : "",
      notes: set.notes || "",
      bgColor: set.bgColor || primary || DEFAULT_BG,
      scope: set.scope || "private",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !editingId || !editForm) return;

    const name = editForm.name.trim() || "Mes fléchettes";
    const brand = editForm.brand.trim();
    const notes = editForm.notes.trim();
    const weight = parseInt(editForm.weightGrams, 10);
    const weightGrams = Number.isFinite(weight) ? weight : undefined;
    const scope = editForm.scope;

    try {
      updateDartSet(editingId, {
        name,
        brand: brand || undefined,
        weightGrams,
        notes: notes || undefined,
        bgColor: editForm.bgColor || DEFAULT_BG,
        scope,
      });

      reloadSets();
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      console.warn("[DartSetsPanel] update error", err);
    }
  };

  const handleDelete = (set: DartSet | null) => {
    if (!set) return;
    if (!window.confirm("Supprimer ce jeu de fléchettes ?")) return;
    deleteDartSet(set.id);
    reloadSets();
    if (editingId === set.id) {
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleSetFavorite = (set: DartSet | null) => {
    if (!profile?.id || !set) return;
    setFavoriteDartSet(profile.id, set.id);
    reloadSets();
  };

  // ------------------------------------------------------------------
  // Carrousel
  // ------------------------------------------------------------------

  const goPrev = () => {
    if (!hasSets) return;
    setActiveIndex((idx) => (idx <= 0 ? sets.length - 1 : idx - 1));
  };

  const goNext = () => {
    if (!hasSets) return;
    setActiveIndex((idx) => (idx >= sets.length - 1 ? 0 : idx + 1));
  };

  // ------------------------------------------------------------------
  // Libellés
  // ------------------------------------------------------------------

  const title =
    lang === "fr"
      ? "MES FLÉCHETTES"
      : lang === "es"
      ? "MIS DARDOS"
      : lang === "de"
      ? "MEINE DARTS"
      : "MY DARTS";

  const subtitle =
    lang === "fr"
      ? "Associe tes stats à chaque jeu de fléchettes."
      : lang === "es"
      ? "Asocia tus estadísticas a cada juego de dardos."
      : lang === "de"
      ? "Verknüpfe deine Statistiken mit jedem Dart-Set."
      : "Link your stats to each dart set.";

  const labelCreate =
    lang === "fr"
      ? "Créer"
      : lang === "es"
      ? "Crear"
      : lang === "de"
      ? "Neu"
      : "Create";

  const labelScanner = lang === "fr" ? "Scanner" : "Scan";
  const labelEdit =
    lang === "fr"
      ? "Éditer"
      : lang === "es"
      ? "Editar"
      : lang === "de"
      ? "Bearbeiten"
      : "Edit";
  const labelDelete =
    lang === "fr"
      ? "Suppr."
      : lang === "es"
      ? "Eliminar"
      : lang === "de"
      ? "Löschen"
      : "Delete";
  const labelFav =
    lang === "fr"
      ? "Favori"
      : lang === "es"
      ? "Favorito"
      : lang === "de"
      ? "Favorit"
      : "Favorite";

  // ------------------------------------------------------------------

  return (
    <div
      style={{
        borderRadius: 16,
        padding: 12,
        background:
          "linear-gradient(135deg, rgba(8,8,16,.96), rgba(8,12,24,.96))",
        boxShadow: "0 0 22px rgba(0,0,0,.7)",
        border: "1px solid rgba(255,255,255,.08)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Header néon */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ position: "relative", paddingLeft: 2 }}>
          <div
            style={{
              position: "absolute",
              inset: -6,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 0% 0%, rgba(245,195,91,.35), transparent 60%)",
              opacity: 0.9,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "relative",
              fontSize: 13,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#fff",
              textShadow:
                "0 0 6px rgba(245,195,91,.8), 0 0 14px rgba(245,195,91,.5)",
            }}
          >
            {title}
          </div>
          <div
            style={{
              position: "relative",
              marginTop: 2,
              fontSize: 10,
              color: "rgba(255,255,255,.55)",
            }}
          >
            {subtitle}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setEditForm(null);
            setIsCreating((x) => !x);
          }}
          style={{
            position: "relative",
            fontSize: 11,
            padding: "6px 12px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,.16)",
            background:
              "linear-gradient(135deg, rgba(12,8,0,1), rgba(80,50,10,1))",
            color: "#fff",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1.6,
            boxShadow:
              "0 0 10px rgba(245,195,91,.6), 0 0 24px rgba(245,195,91,.35)",
          }}
        >
          {labelCreate}
        </button>
      </div>

      {/* Bloc flottant : création */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          style={{
            marginTop: 4,
            padding: 10,
            borderRadius: 14,
            background:
              "linear-gradient(145deg, rgba(12,12,28,.98), rgba(20,20,40,.98))",
            border: "1px solid rgba(255,255,255,.08)",
            boxShadow: "0 0 20px rgba(0,0,0,.8)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <div style={{ gridColumn: "1 / span 2" }}>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.6,
                color: "rgba(245,195,91,.9)",
                marginBottom: 4,
              }}
            >
              {lang === "fr"
                ? "Créer un nouveau set"
                : lang === "es"
                ? "Crear un nuevo set"
                : lang === "de"
                ? "Neues Set erstellen"
                : "Create new set"}
            </div>
          </div>

          <div style={{ gridColumn: "1 / span 2" }}>
            <label
              style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}
            >
              Nom du set
            </label>
            <input
              value={form.name}
              onChange={handleChange("name")}
              placeholder="Ex : Noir 22g Target"
              style={{
                width: "100%",
                marginTop: 2,
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(6,6,14,.96)",
                color: "#fff",
                fontSize: 12,
              }}
            />
          </div>

          <div>
            <label
              style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}
            >
              Marque
            </label>
            <input
              value={form.brand}
              onChange={handleChange("brand")}
              placeholder="Target, Winmau..."
              style={{
                width: "100%",
                marginTop: 2,
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(6,6,14,.96)",
                color: "#fff",
                fontSize: 12,
              }}
            />
          </div>

          <div>
            <label
              style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}
            >
              Poids (g)
            </label>
            <input
              value={form.weightGrams}
              onChange={handleChange("weightGrams")}
              placeholder="18, 20, 22..."
              inputMode="numeric"
              style={{
                width: "100%",
                marginTop: 2,
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(6,6,14,.96)",
                color: "#fff",
                fontSize: 12,
              }}
            />
          </div>

          <div style={{ gridColumn: "1 / span 2" }}>
            <label
              style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}
            >
              Notes (optionnel)
            </label>
            <textarea
              value={form.notes}
              onChange={handleChange("notes")}
              rows={2}
              placeholder="Grip, longueur, feeling..."
              style={{
                width: "100%",
                marginTop: 2,
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(6,6,14,.96)",
                color: "#fff",
                fontSize: 12,
                resize: "vertical",
              }}
            />
          </div>

          {/* Scope création */}
          <div style={{ gridColumn: "1 / span 2", marginTop: 4 }}>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,.6)",
                marginBottom: 4,
              }}
            >
              Utilisable :
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, scope: "private" }))
                }
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border:
                    form.scope === "private"
                      ? "1px solid #f5c35b"
                      : "1px solid rgba(255,255,255,.15)",
                  background:
                    form.scope === "private"
                      ? "rgba(245,195,91,.25)"
                      : "rgba(255,255,255,.05)",
                  color: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Privé
              </button>

              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, scope: "public" }))
                }
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border:
                    form.scope === "public"
                      ? "1px solid #7ee6a5"
                      : "1px solid rgba(255,255,255,.15)",
                  background:
                    form.scope === "public"
                      ? "rgba(127,230,165,.25)"
                      : "rgba(255,255,255,.05)",
                  color: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Public
              </button>
            </div>
          </div>

          <div>
            <label
              style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}
            >
              Couleur de fond
            </label>
            <input
              type="color"
              value={form.bgColor}
              onChange={handleChange("bgColor")}
              style={{
                width: "100%",
                marginTop: 2,
                padding: 0,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.2)",
                background: "transparent",
                height: 32,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button
              type="submit"
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "none",
                background:
                  "radial-gradient(circle at 0% 0%, rgba(127,226,169,.4), rgba(8,40,24,.9))",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1.4,
              }}
            >
              {lang === "fr"
                ? "Enregistrer"
                : lang === "es"
                ? "Guardar"
                : lang === "de"
                ? "Speichern"
                : "Save"}
            </button>
          </div>
        </form>
      )}

      {/* Bloc flottant : édition */}
      {editingId && editForm && (
        <form
          onSubmit={handleUpdate}
          style={{
            marginTop: 4,
            padding: 10,
            borderRadius: 14,
            background:
              "linear-gradient(145deg, rgba(10,10,24,.98), rgba(18,28,40,.98))",
            border: "1px solid rgba(255,255,255,.1)",
            boxShadow: "0 0 20px rgba(0,0,0,.8)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <div style={{ gridColumn: "1 / span 2" }}>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.6,
                color: "rgba(127,196,255,.95)",
                marginBottom: 4,
              }}
            >
              {lang === "fr"
                ? "Modifier ce set"
                : lang === "es"
                ? "Editar este set"
                : lang === "de"
                ? "Set bearbeiten"
                : "Edit this set"}
            </div>
          </div>

          <div style={{ gridColumn: "1 / span 2" }}>
            <label
              style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}
            >
              Nom du set
            </label>
            <input
              value={editForm.name}
              onChange={handleEditChange("name")}
              placeholder="Ex : Noir 22g Target"
              style={{
                width: "100%",
                marginTop: 2,
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.18)",
                background: "rgba(6,6,14,.96)",
                color: "#fff",
                fontSize: 12,
              }}
            />
          </div>

          <div>
            <label
              style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}
            >
              Marque
            </label>
            <input
              value={editForm.brand}
              onChange={handleEditChange("brand")}
              placeholder="Target, Winmau..."
              style={{
                width: "100%",
                marginTop: 2,
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.18)",
                background: "rgba(6,6,14,.96)",
                color: "#fff",
                fontSize: 12,
              }}
            />
          </div>

          <div>
            <label
              style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}
            >
              Poids (g)
            </label>
            <input
              value={editForm.weightGrams}
              onChange={handleEditChange("weightGrams")}
              placeholder="18, 20, 22..."
              inputMode="numeric"
              style={{
                width: "100%",
                marginTop: 2,
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.18)",
                background: "rgba(6,6,14,.96)",
                color: "#fff",
                fontSize: 12,
              }}
            />
          </div>

          <div style={{ gridColumn: "1 / span 2" }}>
            <label
              style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}
            >
              Notes (optionnel)
            </label>
            <textarea
              value={editForm.notes}
              onChange={handleEditChange("notes")}
              rows={2}
              placeholder="Grip, longueur, feeling..."
              style={{
                width: "100%",
                marginTop: 2,
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.18)",
                background: "rgba(6,6,14,.96)",
                color: "#fff",
                fontSize: 12,
                resize: "vertical",
              }}
            />
          </div>

          {/* Scope édition */}
          <div style={{ gridColumn: "1 / span 2", marginTop: 4 }}>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,.6)",
                marginBottom: 4,
              }}
            >
              Utilisable :
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() =>
                  setEditForm((prev) =>
                    prev ? { ...prev, scope: "private" } : prev
                  )
                }
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border:
                    editForm.scope === "private"
                      ? "1px solid #f5c35b"
                      : "1px solid rgba(255,255,255,.15)",
                  background:
                    editForm.scope === "private"
                      ? "rgba(245,195,91,.25)"
                      : "rgba(255,255,255,.05)",
                  color: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Privé
              </button>

              <button
                type="button"
                onClick={() =>
                  setEditForm((prev) =>
                    prev ? { ...prev, scope: "public" } : prev
                  )
                }
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border:
                    editForm.scope === "public"
                      ? "1px solid #7ee6a5"
                      : "1px solid rgba(255,255,255,.15)",
                  background:
                    editForm.scope === "public"
                      ? "rgba(127,230,165,.25)"
                      : "rgba(255,255,255,.05)",
                  color: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Public
              </button>
            </div>
          </div>

          <div>
            <label
              style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}
            >
              Couleur de fond
            </label>
            <input
              type="color"
              value={editForm.bgColor}
              onChange={handleEditChange("bgColor")}
              style={{
                width: "100%",
                marginTop: 2,
                padding: 0,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.25)",
                background: "transparent",
                height: 32,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={handleCancelEdit}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.25)",
                background: "rgba(255,255,255,.05)",
                color: "#fff",
                fontSize: 12,
              }}
            >
              {lang === "fr"
                ? "Annuler"
                : lang === "es"
                ? "Cancelar"
                : lang === "de"
                ? "Abbrechen"
                : "Cancel"}
            </button>

            <button
              type="submit"
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "none",
                background:
                  "radial-gradient(circle at 0% 0%, rgba(127,226,169,.5), rgba(8,40,24,.95))",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1.4,
              }}
            >
              {lang === "fr"
                ? "Mettre à jour"
                : lang === "es"
                ? "Actualizar"
                : lang === "de"
                ? "Aktualisieren"
                : "Update"}
            </button>
          </div>
        </form>
      )}

      {/* Carrousel */}
      {hasSets ? (
        <>
          <div
            style={{
              marginTop: 4,
              padding: 8,
              borderRadius: 14,
              background:
                "linear-gradient(135deg, rgba(8,8,18,.98), rgba(12,16,30,.98))",
              border: "1px solid rgba(255,255,255,.06)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Boutons de navigation */}
            <button
              type="button"
              onClick={goPrev}
              style={{
                position: "absolute",
                left: 4,
                top: "50%",
                transform: "translateY(-50%)",
                width: 26,
                height: 26,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.4)",
                background: "rgba(0,0,0,.6)",
                color: "#fff",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              ◀
            </button>

            <button
              type="button"
              onClick={goNext}
              style={{
                position: "absolute",
                right: 4,
                top: "50%",
                transform: "translateY(-50%)",
                width: 26,
                height: 26,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.4)",
                background: "rgba(0,0,0,.6)",
                color: "#fff",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              ▶
            </button>

            {/* Wrapper carte + indicateur */}
            {activeSet && (
              <div
                style={{
                  marginInline: 30,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {/* Carte du set actif */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  {/* Infos gauche */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      overflow: "hidden",
                    }}
                  >
                    {/* Ligne 1 : nom + favori */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#fff",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                        }}
                      >
                        {activeSet.name}
                      </div>
                      {activeSet.isFavorite && (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            border: "1px solid rgba(245,195,91,.9)",
                            background:
                              "linear-gradient(135deg, rgba(40,26,0,1), rgba(120,90,20,1))",
                            fontSize: 10,
                            textTransform: "uppercase",
                            letterSpacing: 1.2,
                            color: "rgba(255,235,190,.98)",
                          }}
                        >
                          ★ {labelFav}
                        </span>
                      )}
                    </div>

                    {/* Ligne 2 : marque + poids */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        fontSize: 11,
                        color: "rgba(255,255,255,.7)",
                      }}
                    >
                      {activeSet.brand && <span>{activeSet.brand}</span>}
                      {typeof activeSet.weightGrams === "number" && (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,.25)",
                            fontSize: 10,
                          }}
                        >
                          {activeSet.weightGrams} g
                        </span>
                      )}
                    </div>

                    {/* Ligne 3 : scope + usage */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        fontSize: 10,
                        color: "rgba(255,255,255,.7)",
                      }}
                    >
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          border:
                            activeSet.scope === "public"
                              ? "1px solid rgba(127,230,165,.8)"
                              : "1px solid rgba(255,255,255,.25)",
                          background:
                            activeSet.scope === "public"
                              ? "rgba(127,230,165,.18)"
                              : "rgba(255,255,255,.06)",
                          color:
                            activeSet.scope === "public"
                              ? "rgba(180,255,210,.98)"
                              : "rgba(220,220,255,.9)",
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        {activeSet.scope === "public"
                          ? lang === "fr"
                            ? "Public"
                            : lang === "es"
                            ? "Público"
                            : lang === "de"
                            ? "Öffentlich"
                            : "Public"
                          : lang === "fr"
                          ? "Privé"
                          : lang === "es"
                          ? "Privado"
                          : lang === "de"
                          ? "Privat"
                          : "Private"}
                      </span>

                      {typeof activeSet.usageCount === "number" &&
                        activeSet.usageCount > 0 && (
                          <span
                            style={{
                              fontSize: 10,
                              color: "rgba(180,255,200,.85)",
                            }}
                          >
                            {lang === "fr"
                              ? `${activeSet.usageCount} match(s)`
                              : lang === "es"
                              ? `${activeSet.usageCount} partida(s)`
                              : lang === "de"
                              ? `${activeSet.usageCount} Spiel(e)`
                              : `${activeSet.usageCount} match(es)`}
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Image droite */}
                  <div
                    style={{
                      width: 80,
                      height: 70,
                      borderRadius: 14,
                      background: activeSet.bgColor || DEFAULT_BG,
                      border: "1px solid rgba(255,255,255,.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: "rotate(18deg)",
                      overflow: "hidden",
                    }}
                  >
                    {activeSet.thumbImageUrl || activeSet.mainImageUrl ? (
                      <img
                        src={
                          activeSet.thumbImageUrl || activeSet.mainImageUrl
                        }
                        alt={activeSet.name}
                        style={{
                          width: "110%",
                          height: "110%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: 24 }}>🎯</span>
                    )}
                  </div>
                </div>

                {/* Indicateur position carrousel */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 4,
                    marginTop: 4,
                  }}
                >
                  {sets.map((s, idx) => (
                    <div
                      key={s.id}
                      style={{
                        width: idx === activeIndex ? 10 : 6,
                        height: 6,
                        borderRadius: 999,
                        background:
                          idx === activeIndex
                            ? "rgba(245,195,91,.9)"
                            : "rgba(255,255,255,.25)",
                        transition: "all .18s",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Barre d'actions globale */}
          <div
            style={{
              marginTop: 8,
              padding: 8,
              borderRadius: 12,
              background: "rgba(8,8,18,.95)",
              border: "1px solid rgba(255,255,255,.05)",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 6,
            }}
          >
            {[
              {
                key: "scan",
                label: labelScanner,
                onClick: () => activeSet && setScannerTarget(activeSet),
                disabled: !activeSet,
              },
              {
                key: "edit",
                label: labelEdit,
                onClick: () => handleStartEdit(activeSet),
                disabled: !activeSet,
              },
              {
                key: "delete",
                label: labelDelete,
                onClick: () => handleDelete(activeSet),
                disabled: !activeSet,
              },
              {
                key: "fav",
                label: labelFav,
                onClick: () => handleSetFavorite(activeSet),
                disabled: !activeSet,
              },
            ].map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={btn.onClick}
                disabled={btn.disabled}
                style={{
                  padding: "6px 4px",
                  borderRadius: 999,
                  border:
                    btn.key === "scan"
                      ? "1px solid rgba(127,226,169,.8)"
                      : btn.key === "delete"
                      ? "1px solid rgba(255,120,120,.8)"
                      : btn.key === "fav"
                      ? "1px solid rgba(245,195,91,.9)"
                      : "1px solid rgba(127,196,255,.8)",
                  background: btn.disabled
                    ? "rgba(40,40,50,.7)"
                    : btn.key === "scan"
                    ? "radial-gradient(circle at 0% 0%, rgba(127,226,169,.4), rgba(8,28,18,.95))"
                    : btn.key === "delete"
                    ? "radial-gradient(circle at 0% 0%, rgba(255,120,120,.4), rgba(40,8,8,.95))"
                    : btn.key === "fav"
                    ? "radial-gradient(circle at 0% 0%, rgba(245,195,91,.45), rgba(40,28,8,.95))"
                    : "radial-gradient(circle at 0% 0%, rgba(127,196,255,.45), rgba(8,20,40,.95))",
                  color: btn.disabled ? "rgba(140,140,160,.8)" : "#fff",
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 1.1,
                  opacity: btn.disabled ? 0.5 : 1,
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: "rgba(255,255,255,.45)",
          }}
        >
          {lang === "fr"
            ? "Tu n'as pas encore enregistré de jeu de fléchettes. Crée ton premier set pour commencer à comparer tes stats."
            : lang === "es"
            ? "Aún no has registrado ningún juego de dardos. Crea tu primer set para empezar a comparar tus estadísticas."
            : lang === "de"
            ? "Du hast noch keine Dart-Sets gespeichert. Erstelle dein erstes Set, um deine Statistiken zu vergleichen."
            : "You haven't saved any dart sets yet. Create your first set to start comparing your stats."}
        </div>
      )}

      {/* Sheet Scanner */}
      {scannerTarget && (
        <DartSetScannerSheet
          dartSet={scannerTarget}
          onClose={() => setScannerTarget(null)}
          onUpdated={(updated) => {
            setSets((prev) =>
              sortSets(prev.map((s) => (s.id === updated.id ? updated : s)))
            );
          }}
        />
      )}
    </div>
  );
};

export default DartSetsPanel;

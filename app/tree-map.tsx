"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { Tree } from "../lib/domain";
import "leaflet/dist/leaflet.css";
import "./tree-map.css";

type Props = {
  trees: Tree[];
  center: { lat: number; lng: number };
  radius: number;
  selectedId?: string;
  onSelect: (tree: Tree) => void;
  onCenter: (lat: number, lng: number) => void;
};
type Runtime = {
  map: Leaflet.Map;
  L: typeof Leaflet;
  markers: Leaflet.LayerGroup;
  range: Leaflet.Circle;
  center: Leaflet.CircleMarker;
  tiles: Leaflet.TileLayer;
};

export function TreeMap({
  trees,
  center,
  radius,
  selectedId,
  onSelect,
  onCenter,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const initial = useRef({ center, radius });
  const callbacks = useRef({ onSelect, onCenter });
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [tileError, setTileError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    callbacks.current = { onSelect, onCenter };
  }, [onSelect, onCenter]);

  useEffect(() => {
    let disposed = false;
    let map: Leaflet.Map | undefined;
    let observer: ResizeObserver | undefined;
    const container = host.current;
    if (!container) return;
    void import("leaflet")
      .then((L) => {
        if (disposed) return;
        const position: Leaflet.LatLngExpression = [
          initial.current.center.lat,
          initial.current.center.lng,
        ];
        map = L.map(container, {
          center: position,
          zoom: 16,
          scrollWheelZoom: false,
          keyboard: true,
          zoomControl: true,
          attributionControl: true,
        });
        map.zoomControl.setPosition("topright");
        const tiles = L.tileLayer(
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
          },
        ).addTo(map);
        tiles.on("tileerror", () => {
          if (!disposed) setTileError(true);
        });
        const range = L.circle(position, {
          radius: initial.current.radius,
          color: "#52794c",
          weight: 1.5,
          dashArray: "6 6",
          fillColor: "#77985a",
          fillOpacity: 0.08,
          interactive: false,
        }).addTo(map);
        const centerMarker = L.circleMarker(position, {
          radius: 8,
          color: "white",
          weight: 3,
          fillColor: "#4e84ae",
          fillOpacity: 1,
          interactive: false,
        }).addTo(map);
        const markers = L.layerGroup().addTo(map);
        map.fitBounds(range.getBounds(), {
          padding: [25, 25],
          maxZoom: 17,
          animate: false,
        });
        map.on("click", (event: Leaflet.LeafletMouseEvent) =>
          callbacks.current.onCenter(event.latlng.lat, event.latlng.lng),
        );
        if (typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(() =>
            map?.invalidateSize({ pan: false }),
          );
          observer.observe(container);
        }
        setRuntime({ map, L, markers, range, center: centerMarker, tiles });
      })
      .catch(() => {
        if (!disposed) setLoadError(true);
      });
    return () => {
      disposed = true;
      observer?.disconnect();
      map?.remove();
    };
  }, []);

  useEffect(() => {
    if (!runtime) return;
    const point: Leaflet.LatLngExpression = [center.lat, center.lng];
    runtime.range.setLatLng(point).setRadius(radius);
    runtime.center.setLatLng(point);
    runtime.map.fitBounds(runtime.range.getBounds(), {
      padding: [25, 25],
      maxZoom: 17,
      animate: false,
    });
  }, [runtime, center.lat, center.lng, radius]);

  useEffect(() => {
    if (!runtime) return;
    const { L, markers } = runtime;
    markers.clearLayers();
    trees.forEach((tree, index) => {
      const selected = tree.id === selectedId;
      const icon = L.divIcon({
        className: "junior-leaflet-icon",
        html: `<span class="junior-map-pin${selected ? " is-selected" : ""}"><b style="transform:rotate(45deg)">${index + 1}</b></span>`,
        iconSize: [40, 46],
        iconAnchor: [20, 42],
        popupAnchor: [0, -35],
      });
      const marker = L.marker([tree.lat, tree.lng], {
        icon,
        keyboard: true,
        title: `${tree.name} · ${tree.species}${tree.sample ? " · 샘플 나무" : ""}`,
        alt: tree.name,
        bubblingMouseEvents: false,
        riseOnHover: true,
      }).addTo(markers);
      const popup = document.createElement("div");
      popup.className = "junior-map-popup";
      const title = document.createElement("strong");
      title.textContent = tree.name;
      const detail = document.createElement("span");
      detail.textContent = `${tree.species} · ${tree.location}`;
      const badge = document.createElement("small");
      badge.textContent = tree.sample
        ? "체험용 샘플 · 실제 나무 위치가 아니에요"
        : "나무 위치";
      popup.appendChild(title);
      popup.appendChild(detail);
      popup.appendChild(badge);
      marker.bindPopup(popup);
      marker.on("click", () => callbacks.current.onSelect(tree));
      if (selected) marker.openPopup();
    });
    return () => {
      markers.clearLayers();
    };
  }, [runtime, trees, selectedId]);

  return (
    <div className="junior-live-map">
      <div
        ref={host}
        className="junior-live-map-canvas"
        role="region"
        aria-label="실제 도로 지도 위 샘플 나무. 방향키로 이동하고 더하기 빼기로 확대 축소하세요. 지도 클릭 또는 지도 중심으로 찾기로 검색 위치를 바꿀 수 있습니다."
        tabIndex={0}
      />
      {!runtime && !loadError && (
        <div className="junior-map-loading" role="status">
          산책길 지도를 펼치고 있어요…
        </div>
      )}
      <div className="junior-map-sample-label">실제 지도 · 나무는 샘플</div>
      <div className="junior-map-center-cross" aria-hidden="true">
        +
      </div>
      {runtime && (
        <button
          type="button"
          className="junior-map-search-center"
          onClick={() => {
            const point = runtime.map.getCenter();
            onCenter(point.lat, point.lng);
          }}
        >
          ⌖ 지도 중심으로 찾기
        </button>
      )}
      {(tileError || loadError) && (
        <div className="junior-map-error" role="status">
          {loadError ? (
            "지도를 불러오지 못했어요. 아래 목록과 좌표 검색을 이용해 주세요."
          ) : (
            <>
              지도 배경을 불러오지 못했어요. 나무 목록과 검색은 사용할 수
              있어요.{" "}
              <button
                type="button"
                onClick={() => {
                  setTileError(false);
                  runtime?.tiles.redraw();
                }}
              >
                다시 불러오기
              </button>
            </>
          )}
        </div>
      )}
      <div className="junior-map-legend">
        <span>
          <i /> 검색 기준점
        </span>
        <span>
          <i /> 가까운 나무 {trees.length}그루
        </span>
        <small>지도를 눌러 위치 선택 · 방향키로 이동</small>
      </div>
    </div>
  );
}

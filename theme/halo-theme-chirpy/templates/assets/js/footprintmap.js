/**
 * Footprint Map Core (Plugin Architecture)
 * Author: Xiaoten(www.xiaoten.com)
 * License: MIT
 */

(function () {
    'use strict';

    // 1. 全局命名空间与插件注册表
    window.FootprintMap = window.FootprintMap || {};
    window.FootprintMap.Plugins = window.FootprintMap.Plugins || {};

    // 2. 主配置
    const CONFIG = {
        MARKER_STYLES: {
            sunset: 'linear-gradient(135deg, #ffb347, #ff6f61)',
            ocean: 'linear-gradient(135deg, #06beb6, #48b1bf)',
            violet: 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
            forest: 'linear-gradient(135deg, #5ee7df, #39a37c)',
            amber: 'linear-gradient(135deg, #f6d365, #fda085)',
            citrus: 'linear-gradient(135deg, #fdfb8f, #a1ffce)'
        },
        MARKER_PRESETS: ['sunset', 'ocean', 'violet', 'forest', 'amber', 'citrus'],
        MAP_STYLES: {
            amap: { light: 'amap://styles/normal', dark: 'amap://styles/dark' }
        },
        MARKER_SIZE: 18,
        GRID_SIZE: 80,
        OFFSET_DESKTOP: 100,
        OFFSET_MOBILE: 140,

        // [新增] 高亮插件系统核心配置
        HIGHLIGHT: {
            // 模式选择：'none' (不开启), 'hover' (悬浮联动高亮), 'visited' (永久点亮去过的地方)
            mode: 'none', 
            
            // 数据源：支持同时加载中国省份和世界国家边界
            geojsonUrls: [
                './static/data/provinces.geojson',
                './static/data/world.geojson'
            ],
            // 排除高亮的标签（包含以下纯标签的足迹点不会点亮所在区域）
            excludeTags: ['计划'], 
            
            // 样式配置
            style: {
                default: {
                    strokeColor: '#ffffff', strokeOpacity: 0, strokeWeight: 0,
                    fillColor: '#ffffff', fillOpacity: 0, zIndex: 1
                },
                active: {
                    strokeColor: '#5ee7df', strokeOpacity: 0.8, strokeWeight: 1,
                    fillColor: '#06beb6', fillOpacity: 0.07, zIndex: 10
                }
            }
        }
    };

    // --- 工具类 ---
    const Utils = {
        escapeHtml: (str) => String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]),
        isDarkMode: () => document.documentElement.classList.contains('dark'),
        parseCoords: (val) => {
            if (Array.isArray(val) && val.length >= 2) return { lng: parseFloat(val[0]), lat: parseFloat(val[1]) };
            if (typeof val === 'string') {
                const p = val.split(/[,，\s]+/).map(parseFloat).filter(n => !isNaN(n));
                return p.length >= 2 ? { lng: p[0], lat: p[1] } : null;
            }
            return null;
        },
        sanitizeLocation: (item, index) => {
            if (!item) return null;
            let coordsData = null;
            if (item.coordinates && Array.isArray(item.coordinates) && item.coordinates.length >= 2) {
                coordsData = [item.coordinates[0], item.coordinates[1]];
            } else {
                coordsData = item.coordinate || item.coords || item.position;
            }
            const coords = Utils.parseCoords(coordsData);
            if (!coords) return null;
            const markerPreset = item.markerPreset || CONFIG.MARKER_PRESETS[index % CONFIG.MARKER_PRESETS.length];
            let cats = item.categories || item.category || item.tags || ['Uncategorized'];
            if (typeof cats === 'string') cats = [cats];
            return {
                id: `fp-${index}`, name: item.name || 'Unnamed Location', lat: coords.lat, lng: coords.lng,
                description: item.description || '', date: item.date ? String(item.date) : '',
                url: item.url || '', urlLabel: item.urlLabel || 'View Details',
                photos: Array.isArray(item.photos) ? item.photos : [], categories: cats,
                markerPreset: markerPreset,
                markerStyle: CONFIG.MARKER_STYLES[markerPreset] ? `background:${CONFIG.MARKER_STYLES[markerPreset]}` : (item.markerStyle || '')
            };
        },
        // [共享] 纯数学射线法空间碰撞计算（供各插件复用）
        isPointInGeoJSON: (pt, geometry) => {
            const p = [pt.lng, pt.lat];
            const type = geometry.type;
            const coords = geometry.coordinates;

            const pointInRing = (p, ring) => {
                let inside = false;
                for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                    let xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
                    let intersect = ((yi > p[1]) !== (yj > p[1])) && (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi);
                    if (intersect) inside = !inside;
                    if (Math.abs(p[0] - xi) < 0.0001 && Math.abs(p[1] - yi) < 0.0001) return true;
                }
                return inside;
            };

            const pointInPoly = (p, polyCoords) => {
                if (!pointInRing(p, polyCoords[0])) return false;
                for (let i = 1; i < polyCoords.length; i++) if (pointInRing(p, polyCoords[i])) return false;
                return true;
            };

            if (type === 'Polygon') return pointInPoly(p, coords);
            if (type === 'MultiPolygon') return coords.some(poly => pointInPoly(p, poly));
            return false;
        }
    };
    
    // 暴露 Utils 供插件使用
    window.FootprintMap.Utils = Utils;
    window.FootprintMap.CONFIG = CONFIG;

    // --- Popup & 灯箱组件 (保持不变) ---
    const PopupBuilder = {
        build: (point) => {
            const h = Utils.escapeHtml;
            let html = `<div class="footprint-popup"><h4>${h(point.name)}</h4>`;
            if (point.date) html += `<p class="footprint-popup__meta">${h(point.date)}</p>`;
            if (point.categories.length) html += `<div class="footprint-popup__tags">${point.categories.map(c => `<span class="footprint-popup__tag">${h(c)}</span>`).join('')}</div>`;
            if (point.description) html += `<p>${h(point.description)}</p>`;
            if (point.url) html += `<div class="footprint-popup__links"><a class="footprint-popup__link" href="${h(point.url)}" target="_blank" rel="noopener">${h(point.urlLabel || '查看相关内容')}</a></div>`;
            if (point.photos.length) {
                const nav = point.photos.length > 1 ? '<button type="button" class="footprint-popup__photos-btn footprint-popup__photos-btn--prev">&#10094;</button><button type="button" class="footprint-popup__photos-btn footprint-popup__photos-btn--next">&#10095;</button>' : '';
                const slides = point.photos.map((src, i) => `<figure class="footprint-popup__slide"><div class="footprint-popup__slide-loader"></div><img src="${h(src)}" loading="lazy" alt="${h(point.name)}-${i+1}"></figure>`).join('');
                html += `<div class="footprint-popup__photos"${point.photos.length > 1 ? ' data-carousel="true"' : ''}>${nav}<div class="footprint-popup__track">${slides}</div></div>`;
            }
            html += `</div>`;
            return html;
        }
    };

    const PhotoViewer = (() => {
        let el, imgEl, prevBtn, nextBtn, state = { images: [], index: 0 }, isInit = false;
        function init() {
            if (isInit) return;
            el = document.createElement('div'); el.className = 'footprint-photo-viewer';
            el.innerHTML = `<div class="footprint-photo-viewer__mask"></div><div class="footprint-photo-viewer__dialog"><div class="footprint-photo-viewer__loader"></div><button type="button" class="footprint-photo-viewer__close">&times;</button><button type="button" class="footprint-photo-viewer__prev">&#10094;</button><img src="" alt="" /><button type="button" class="footprint-photo-viewer__next">&#10095;</button></div>`;
            document.body.appendChild(el);
            imgEl = el.querySelector('img'); prevBtn = el.querySelector('.footprint-photo-viewer__prev'); nextBtn = el.querySelector('.footprint-photo-viewer__next');
            el.addEventListener('click', (e) => { if (e.target === el || e.target.classList.contains('footprint-photo-viewer__mask') || e.target.classList.contains('footprint-photo-viewer__close')) close(); });
            prevBtn.onclick = (e) => { e.stopPropagation(); prev(); }; nextBtn.onclick = (e) => { e.stopPropagation(); next(); };
            document.addEventListener('keydown', (e) => { if (!el.classList.contains('is-visible')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') prev(); if (e.key === 'ArrowRight') next(); });
            isInit = true;
        }
        function update() {
            if (!state.images.length) return;
            const loader = el.querySelector('.footprint-photo-viewer__loader');
            if (loader) loader.style.display = 'block';
            imgEl.classList.remove('loaded'); imgEl.src = state.images[state.index];
            imgEl.onload = () => { if (loader) loader.style.display = 'none'; imgEl.classList.add('loaded'); };
            imgEl.onerror = () => { if (loader) loader.style.display = 'none'; imgEl.classList.add('loaded'); };
            prevBtn.style.display = state.images.length > 1 ? '' : 'none'; nextBtn.style.display = state.images.length > 1 ? '' : 'none';
        }
        function open(images, idx = 0) {
            init(); state.images = images; state.index = idx; update();
            const fs = document.fullscreenElement;
            if (fs && el.parentElement !== fs) fs.appendChild(el); else if (!fs && el.parentElement !== document.body) document.body.appendChild(el);
            el.classList.add('is-visible'); document.documentElement.classList.add('footprint-photo-viewer-open');
        }
        function close() { el.classList.remove('is-visible'); document.documentElement.classList.remove('footprint-photo-viewer-open'); }
        function prev() { state.index = (state.index - 1 + state.images.length) % state.images.length; update(); }
        function next() { state.index = (state.index + 1) % state.images.length; update(); }
        return { open };
    })();

    document.addEventListener('load', (e) => { if (e.target.matches('.footprint-popup__slide img')) { const loader = e.target.parentElement.querySelector('.footprint-popup__slide-loader'); if (loader) loader.remove(); e.target.classList.add('loaded'); } }, true);
    document.addEventListener('error', (e) => { if (e.target.matches('.footprint-popup__slide img')) { const loader = e.target.parentElement.querySelector('.footprint-popup__slide-loader'); if (loader) loader.remove(); e.target.classList.add('loaded'); } }, true);

    document.addEventListener('click', (e) => {
        if (e.target.matches('.footprint-popup__photos-btn')) {
            e.stopPropagation();
            const track = e.target.parentElement.querySelector('.footprint-popup__track');
            const slides = track ? Array.from(track.querySelectorAll('.footprint-popup__slide')) : [];
            if (track && slides.length > 0) {
                const dir = e.target.classList.contains('footprint-popup__photos-btn--next') ? 1 : -1;
                const slideWidth = slides.length > 1 ? (slides[1].offsetLeft - slides[0].offsetLeft) : (slides[0].offsetWidth + 8);
                let targetIndex = Math.round(track.scrollLeft / slideWidth) + dir;
                targetIndex = Math.max(0, Math.min(targetIndex, slides.length - 1));
                track.scrollTo({ left: targetIndex * slideWidth, behavior: 'smooth' });
            }
            return;
        }
        if (e.target.matches('.footprint-popup__slide img')) {
            e.stopPropagation();
            const track = e.target.closest('.footprint-popup__track');
            PhotoViewer.open(Array.from(track.querySelectorAll('img')).map(i => i.src), Array.from(track.querySelectorAll('img')).indexOf(e.target));
        }
    }, true);

    // --- AMap Engine ---
    class AMapEngine {
        constructor(container, apiKey) {
            this.container = container;
            this.apiKey = apiKey;
            this.map = null;
            this.markers = [];
            this.clusterMarkers = [];
            this.clusterEnabled = true;
            this.markerData = [];
            this.infoWindow = null;
            this.ignoreMapClick = false;
            
            // 插件实例挂载点
            this.highlightPlugin = null;
        }

        async load() {
            if (window.AMap) return;
            return new Promise((resolve, reject) => {
                const securityCode = this.container.dataset.amapSecurity;
                if (securityCode) {
                    window._AMapSecurityConfig = { securityJsCode: securityCode };
                }

                const s = document.createElement('script');
                s.src = `https://webapi.amap.com/maps?v=2.0&key=${this.apiKey}`;
                s.onload = () => { resolve(); };
                s.onerror = (e) => { reject(new Error('Failed to load AMap script. Please check your network or adblocker.')); };
                document.head.appendChild(s);
            });
        }

        init(locations) {
            const div = document.createElement('div');
            div.className = 'footprint-map__canvas';
            this.container.appendChild(div);

            const initialCenter = locations && locations.length > 0 ? 
                                [locations[0].lng, locations[0].lat] : 
                                [104.195397, 35.86166];

            this.map = new AMap.Map(div, {
                zoom: 4, center: initialCenter,
                mapStyle: Utils.isDarkMode() ? CONFIG.MAP_STYLES.amap.dark : CONFIG.MAP_STYLES.amap.light,
                viewMode: '3D', pitch: 0, rotateEnable: false, pitchEnable: false
            });

            // Add global English tile layer (CartoDB Voyager) for worldwide street details
            const globalLayer = new AMap.TileLayer({
                getTileUrl: function(x, y, z) {
                    return `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
                },
                zIndex: 1,
                opacity: Utils.isDarkMode() ? 0.7 : 1
            });
            globalLayer.setMap(this.map);

            AMap.plugin(['AMap.Scale', 'AMap.MoveAnimation'], () => {
                this.map.addControl(new AMap.Scale({ position: { bottom: '25px', left: '20px' } }));
            });

            this.infoWindow = new AMap.InfoWindow({ anchor: 'bottom-center', offset: new AMap.Pixel(0, 0), autoMove: false, closeWhenClickMap: false });
            this.markerData = locations;

            // [插件系统] 挂载并初始化高亮插件
            if (CONFIG.HIGHLIGHT.mode === 'hover' && window.FootprintMap.Plugins.HoverPlugin) {
                this.highlightPlugin = new window.FootprintMap.Plugins.HoverPlugin(this);
            } else if (CONFIG.HIGHLIGHT.mode === 'visited' && window.FootprintMap.Plugins.VisitedPlugin) {
                this.highlightPlugin = new window.FootprintMap.Plugins.VisitedPlugin(this);
            }
            if (this.highlightPlugin) this.highlightPlugin.init();

            this.updateClusters();
            this.map.on('zoomend', () => this.updateClusters());

            this.map.on('click', () => {
                if (this.ignoreMapClick) return;
                this.infoWindow.close();
                if (this.highlightPlugin && this.highlightPlugin.onMapClick) this.highlightPlugin.onMapClick();
            });

            this.fitView();
            new MutationObserver(() => { 
                this.map.setMapStyle(Utils.isDarkMode() ? CONFIG.MAP_STYLES.amap.dark : CONFIG.MAP_STYLES.amap.light); 
                globalLayer.setOpacity(Utils.isDarkMode() ? 0.7 : 1);
            }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

            return {
                fitView: () => this.fitView(),
                zoomIn: () => this.map.zoomIn(),
                zoomOut: () => this.map.zoomOut(),
                resize: () => this.map.resize(),
                setClusterEnabled: (enabled) => { this.clusterEnabled = enabled; this.updateClusters(); },
                toggleHighlightPlugin: (enabled) => { if (this.highlightPlugin) this.highlightPlugin.toggle(enabled); },
                updateData: (data) => {
                    this.infoWindow.close(); 
                    this.markerData = data;
                    this.updateClusters();
                    this.fitView();
                    if (this.highlightPlugin && this.highlightPlugin.updateData) this.highlightPlugin.updateData();
                }
            };
        }

        updateClusters() {
            this.markers.forEach(m => this.map.remove(m)); this.clusterMarkers.forEach(m => this.map.remove(m));
            this.markers = []; this.clusterMarkers = [];
            const zoom = this.map.getZoom();
            if (!this.clusterEnabled || zoom >= 10) { this.markerData.forEach(pt => this.createMarker(pt)); return; }
            const clusters = {};
            this.markerData.forEach(pt => {
                const pixel = this.map.lngLatToContainer([pt.lng, pt.lat]);
                const key = `${Math.floor(pixel.x / CONFIG.GRID_SIZE)}_${Math.floor(pixel.y / CONFIG.GRID_SIZE)}`;
                (clusters[key] = clusters[key] || []).push(pt);
            });
            Object.values(clusters).forEach(points => { if (points.length === 1) this.createMarker(points[0]); else this.createClusterMarker(points); });
        }

        createMarker(pt) {
            const marker = new AMap.Marker({
                position: [pt.lng, pt.lat],
                content: `<div class="footprint-marker footprint-marker--${pt.markerPreset}" style="${pt.markerStyle}"></div>`,
                offset: new AMap.Pixel(-9, -9), map: this.map
            });

            // 插件钩子：悬浮与移出
            marker.on('mouseover', () => { if (this.highlightPlugin && this.highlightPlugin.onMarkerHover) this.highlightPlugin.onMarkerHover(pt); });
            marker.on('mouseout', () => { if (this.highlightPlugin && this.highlightPlugin.onMarkerOut) this.highlightPlugin.onMarkerOut(pt); });

            marker.on('click', () => {
                this.ignoreMapClick = true; setTimeout(() => { this.ignoreMapClick = false; }, 200);
                
                // 插件钩子：点击锁定
                if (this.highlightPlugin && this.highlightPlugin.onMarkerClick) this.highlightPlugin.onMarkerClick(pt);

                this.infoWindow.setContent(PopupBuilder.build(pt));
                this.infoWindow.open(this.map, [pt.lng, pt.lat]);
                setTimeout(() => {
                    const popupEl = this.container.querySelector('.footprint-popup');
                    if (popupEl) {
                        const track = popupEl.querySelector('.footprint-popup__track');
                        const btns = popupEl.querySelectorAll('.footprint-popup__photos-btn');
                        if (track && btns.length > 0 && track.scrollWidth <= track.clientWidth + 2) btns.forEach(btn => btn.style.display = 'none');
                    }
                }, 50);
                const offsetY = window.innerWidth < 640 ? CONFIG.OFFSET_MOBILE : CONFIG.OFFSET_DESKTOP;
                const pixel = this.map.lngLatToContainer([pt.lng, pt.lat]);
                this.map.panTo(this.map.containerToLngLat(new AMap.Pixel(pixel.x, pixel.y - offsetY)));
            });
            this.markers.push(marker);
        }

        createClusterMarker(points) {
            const count = points.length;
            const centerLng = points.reduce((s, p) => s + p.lng, 0) / count;
            const centerLat = points.reduce((s, p) => s + p.lat, 0) / count;
            const [size, gradient, fontSize] = count < 5 ? [38, 'linear-gradient(135deg, rgba(6,190,182,0.75), rgba(72,177,191,0.75))', '13px'] : count < 10 ? [42, 'linear-gradient(135deg, rgba(94,231,223,0.75), rgba(6,190,182,0.75))', '14px'] : [46, 'linear-gradient(135deg, rgba(255,179,71,0.75), rgba(255,111,97,0.75))', '15px'];
            const marker = new AMap.Marker({
                position: [centerLng, centerLat],
                content: `<div style="width:${size}px;height:${size}px;background:${gradient};border-radius:50%;border:1px solid rgba(255,255,255,0.4);box-shadow:0 4px 12px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${fontSize};cursor:pointer">${count}</div>`,
                offset: new AMap.Pixel(-size/2, -size/2), map: this.map
            });
            marker.on('click', () => {
                this.ignoreMapClick = true; setTimeout(() => { this.ignoreMapClick = false; }, 200);
                this.map.setZoomAndCenter(this.map.getZoom() + 2, [centerLng, centerLat]);
            });
            this.clusterMarkers.push(marker);
        }

        fitView() {
            if (!this.markerData.length) return;
            const poly = new AMap.Polyline({ path: this.markerData.map(p => [p.lng, p.lat]), strokeOpacity: 0, map: this.map });
            this.map.setFitView([poly], false, [60, 80, 60, 80]);
            this.map.remove(poly);
        }
    }

    // --- 主加载流程 ---
    document.addEventListener("DOMContentLoaded", function() {
        const containers = document.querySelectorAll('.footprint-map');
        
        containers.forEach(async (container) => {
            const dataUrl = container.dataset.json;
            if (!dataUrl) return;
            
            container.innerHTML = '<div class="footprint-map__loading" style="text-align:center; padding: 50px;">Loading map data...</div>';
            
            try {
                const raw = await (await fetch(dataUrl)).json();
                const list = (raw.locations || raw).map((item, index) => Utils.sanitizeLocation(item, index)).filter(Boolean);
                
                container.innerHTML = '<div id="leaflet-map" style="width:100%; height:100%; border-radius:12px;"></div>';
                
                const initialCenter = list && list.length > 0 ? [list[0].lat, list[0].lng] : [35.86166, 104.195397];
                
                const map = L.map('leaflet-map').setView(initialCenter, 4);
                
                L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; CARTO',
                    subdomains: 'abcd',
                    maxZoom: 20
                }).addTo(map);

                const markers = L.markerClusterGroup({
                showCoverageOnHover: false,
                maxClusterRadius: 50,
                iconCreateFunction: function(cluster) {
                    const count = cluster.getChildCount();
                    let size, gradient, fontSize;
                    if (count < 5) {
                        size = 38; gradient = 'linear-gradient(135deg, rgba(6,190,182,0.75), rgba(72,177,191,0.75))'; fontSize = '13px';
                    } else if (count < 10) {
                        size = 42; gradient = 'linear-gradient(135deg, rgba(94,231,223,0.75), rgba(6,190,182,0.75))'; fontSize = '14px';
                    } else {
                        size = 46; gradient = 'linear-gradient(135deg, rgba(255,179,71,0.75), rgba(255,111,97,0.75))'; fontSize = '15px';
                    }
                    return L.divIcon({
                        html: `<div style="width:${size}px;height:${size}px;background:${gradient};border-radius:50%;border:1px solid rgba(255,255,255,0.4);box-shadow:0 4px 12px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${fontSize};cursor:pointer">${count}</div>`,
                        className: 'custom-cluster-icon',
                        iconSize: [size, size]
                    });
                }
            });

            list.forEach(item => {
                const marker = L.marker([item.lat, item.lng]);
                
                const h = Utils.escapeHtml || (s => s);
                let popupContent = `<div class="footprint-popup"><h4>${h(item.name)}</h4>`;
                if (item.date) popupContent += `<p class="footprint-popup__meta">${h(item.date)}</p>`;
                if (item.categories && item.categories.length) popupContent += `<div class="footprint-popup__tags">${item.categories.map(c => `<span class="footprint-popup__tag">${h(c)}</span>`).join('')}</div>`;
                if (item.description) popupContent += `<p>${h(item.description)}</p>`;
                if (item.url) popupContent += `<div class="footprint-popup__links"><a class="footprint-popup__link" href="${h(item.url)}" target="_blank" rel="noopener">${h(item.urlLabel || 'View Details')}</a></div>`;
                if (item.photos && item.photos.length) {
                    const nav = item.photos.length > 1 ? '<button type="button" class="footprint-popup__photos-btn footprint-popup__photos-btn--prev">&#10094;</button><button type="button" class="footprint-popup__photos-btn footprint-popup__photos-btn--next">&#10095;</button>' : '';
                    const slides = item.photos.map((src, i) => `<figure class="footprint-popup__slide"><div class="footprint-popup__slide-loader"></div><img src="${h(src)}" loading="lazy" alt="${h(item.name)}-${i+1}" style="width:100%; height:120px; object-fit:cover; border-radius:4px;"></figure>`).join('');
                    popupContent += `<div class="footprint-popup__photos"${item.photos.length > 1 ? ' data-carousel="true"' : ''}>${nav}<div class="footprint-popup__track">${slides}</div></div>`;
                }
                popupContent += `</div>`;
                
                marker.bindPopup(popupContent, {
                    minWidth: 260,
                    maxWidth: 300,
                    className: 'custom-leaflet-popup'
                });
                markers.addLayer(marker);
            });

                map.addLayer(markers);
                
                if (list.length > 0) {
                    map.fitBounds(markers.getBounds(), { padding: [50, 50] });
                }

            } catch (e) {
                container.innerHTML = `<div class="footprint-map__error" style="color:red; padding:20px; text-align:center;">Failed to load map data: ${e.message}</div>`;
            }
        });
    });
})();
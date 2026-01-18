0/* * Lona - Main Script
  * Main UI interactions, navigation, dynamic content loading.
  *   @version 1.0
  *   @date 2025-10-01
  *   @license Proprietary
  *   @author Oxean SA
  *   @description Lona app script, providing dynamic content loading, navigation handling, and UI interactions.
  *   @dependencies
  *   - JSInterface: Custom interface for fetching data and handling user sessions.
  *   - getItem, setItem: Utility functions for session storage management.
  *   @eventListeners
  *   - scroll: Handles scroll events to save scroll position and load more content when near the bottom.
  *   - DOMContentLoaded: Initializes UI elements and sets up event listeners.
  *   @functions
  *   - revealOnScroll: Reveals elements with the class 'fade-in-on-scroll' when they come into view.
  *   - LoginPg: Displays the login page and disables navigation.
  *   - InitUI: Initializes the UI based on the user's login state.
  *   - popState: Handles browser history state changes to navigate between pages.
  *   - UserTracker: Simple user interaction tracker for clicks, scrolls, and visibility changes.
  *   - checkAndSetHistory: Checks if the current page is already in history and sets the history state accordingly.
  *   - autoScrollPosts: Automatically scrolls a posts container at a specified speed, pausing on user interaction.
  *   - Reload: Clears session storage and reloads the page.
  *   - reloadImage: Reloads an image by appending a query parameter to bypass cache.
  *   - imgError: Sets a default image source if the original image fails to load.
  *   - loadImageWithPreview: Loads a low-resolution image first, then replaces it with a high-resolution image once loaded.
  *   - onImgLoad: Handles image loading with lazy loading and placeholder functionality.
  *   - getCanvasPlaceholderColor: Retrieves the background color for canvas placeholders from CSS variables.
  *   - renderImageOnCanvasLazy: Renders an image on a canvas with lazy loading and a placeholder.
  *   - renderVideoOnCanvasLazy: Renders a video on a canvas with lazy loading, exclusive playback, and optional controls.
  *   - createVideoElement: Creates a video element with a specified source and poster image.
  *   - videoActions: Handles video playback controls, including play/pause, volume, and fullscreen.
  *   - onVideoLoad: Initializes video elements with lazy loading and playback controls.
  *   - getUserPairRoomId: Generates a unique room user_id for user pair chats.
  *   - SocketManager: Manages WebSocket connections for real-time chat functionality.
  *   
  *      
*/
const $ = document.querySelector.bind(document);

const _server_addr = "api.oxeansa.co.za";
const _server = "https://" + _server_addr;
const _server_v2 = "https://" + _server_addr;
const _server_cdn = 'http://cdn.oxeansa.co.za';

const bodyData = { "version": "1.0", "user_id": getItem("user_id") };

let setHistory = true
let isLoadingMore = false;
let lastScrollY = 0;
let scrollTriggerDistance = 1000;

const path = window.location.pathname;
const list = path.split('/');
const cookieName = list.filter(n => n).pop();

window.addEventListener('scroll', function () {
  setTimeout(function () {
    const currentPage = getItem("currentLayout") || "";
    const scrollKey = `${cookieName}_${currentPage}_scroll`;
    const positionState = {
      scrollX: window.pageXOffset,
      scrollY: window.scrollY,
    };
    setCookie(scrollKey, JSON.stringify(positionState), { 'max-age': 'session' });
  }, 300);
  /*
  const topNav = document.querySelector('.top-nav');
  
  if (window.scrollY > 100) {
    topNav.classList.add('scrolled');
  } else {
    topNav.classList.remove('scrolled');
  }
  */
  // Only trigger if scrolling down
  if (window.scrollY < lastScrollY) {
    lastScrollY = window.scrollY;
    return;
  }
  lastScrollY = window.scrollY;

  if (isLoadingMore) return;
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - scrollTriggerDistance;
  const currentPage = getItem("currentLayout");
  const mediaLoader = document.querySelector('.post-media-bottom-loader');
  if (nearBottom && currentPage == "home") {
    let cachedPosts = window.sessionStorage.getItem("home_posts_dynamic");
    isLoadingMore = true;
    mediaLoader.style.display = "block";
    fetchData("/query/fyp", "POST", bodyData, "no-cache")
      .then(response => response.json())
      .then(newPosts => {
        if (newPosts && newPosts.length) {
          const postsContainer = document.querySelector('#posts');
          mediaLoader.style.display = "none";
          newPosts.forEach(post => {
            if (post.priority === 'ad') return;
            postsContainer.appendChild(createPostElement(post));
            window.sessionStorage.setItem(`postdata${post.post_id}`, JSON.stringify(post));
          });
          // Merge with cached posts

          try {
            cachedPosts = cachedPosts ? JSON.parse(cachedPosts) : [];
          } catch (e) {
            cachedPosts = [];
          }
          const updatedPosts = cachedPosts.concat(newPosts);
          window.sessionStorage.setItem("home_posts_dynamic", JSON.stringify(updatedPosts));
        }
        isLoadingMore = false;
      });
  }

}, { passive: true });

function revealOnScroll() {
  document.querySelectorAll('.fade-in-on-scroll').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 30) {
      el.classList.add('visible');
    }
  });
}
window.addEventListener('scroll', revealOnScroll);
window.addEventListener('DOMContentLoaded', revealOnScroll);

function fetchData(endpoint, method = "POST", body = null, cache = "no-cache") {
  const url = `${_server}${endpoint}`;
  
  const headers = new Headers();

  headers.append("Content-Type", "application/json");
  headers.append("Accept", "application/json");

  if (getItem("LOGGEDIN") == "true" && getItem("refresh_token") !== "") {
    headers.append("Authorization", `Bearer ${getItem("access_token")}`);
    headers.append("X-Refresh-Token", getItem("refresh_token"));
  }
  if (body) {
    body = JSON.stringify(body);
    bodyData.page = "";
  }
  return fetch(url, {
    method: method,
    headers: headers,
    cache: cache,
    body: body
  })
}


/*

const SocketManager = (() => {
  if (typeof io === "function") {
  const socket = io(_server, { transports: ['websocket'] });
}

  let currentRoomId = null;

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('chat_message', (msg) => {
    document.dispatchEvent(new CustomEvent('socket:chat_message', { detail: msg }));
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  // Join a user-pair room (e.g., "user_1_2")
  function joinUserRoom(roomId) {
    if (currentRoomId && currentRoomId !== roomId) {
      socket.emit('leave_room', { room: currentRoomId });
    }
    socket.emit('join_room', { room: roomId });
    currentRoomId = roomId;
  }

  // Leave a user-pair room
  function leaveRoom(roomId) {
    socket.emit('leave_room', { room: roomId });
  }

  // Send a message to the room
  function sendMessage({ roomId, fromUserId, toUserId, content }) {
    socket.emit('chat_message', {
      room: roomId,
      from: fromUserId,
      to: toUserId,
      content: content,
      timestamp: Date.now()
    });
  }

  return {
    socket,
    sendMessage,
    joinUserRoom,
    leaveRoom
  };
})();

function getUserPairRoomId(userId1, userId2) {
  // Always sort to ensure the same room for both users
  const [a, b] = [userId1, userId2].sort();
  return `user_${a}_${b}`;
}
*/


function LoginPg() {
  disableNavigation();
  $("#c220").style.display = "none";
  $('#c100').style.display = 'block';

  $('#pg').innerHTML = "";
  $("#pg").appendChild(createAuthElement());
};

function popState(event, page) {
  if (!window.history) return;

  if (event.state) {
    const overlay = document.querySelector('.overlay-page');
    currentLayout = page;

    // Hide collapsed navs if open
    if ($(".top-nav-collapsed-content").style.display === "block") {
      $(".top-nav-collapsed-content").style.display = "none";
    }

    // If overlay is open, close it and restore state
    if ($(".overlay-page").style.display === "block") {
      $(".overlay-page").style.display = "none";
      $(".overlay-page").innerHTML = "";
      setHistory = false;
      if (event.state.layout === "home") {
        // restorePostsState();
        setItem("currentLayout", "home");
      } else if (event.state.layout === "friends") {
        setItem("currentLayout", "friends");
      } else if (event.state.layout === "messages") {
        setItem("currentLayout", "messages");
      } else if (event.state.layout === "explore") {
        restorePostsState();
        setItem("currentLayout", "explore");
      } else if (event.state.layout === "profile") {
        setItem("currentLayout", "profile");
      }
    } else if (event.state.layout === "home") {
      setHistory = false;
      nurl("home", document.querySelector('.nav-button-home'), 'useCache');
    } else if (event.state.layout === "friends") {
      setHistory = false;
      nurl("friends", document.querySelector('.nav-button-friends'), 'useCache');
    } else if (event.state.layout === "messages") {
      setHistory = false;
      nurl("messages", document.querySelector('.nav-button-messages'), 'useCache');
    } else if (event.state.layout === "explore") {
      setHistory = false;
      if (currentLayout === "explore") {
        window.history.back();
      } else {
        nurl("explore", document.querySelector('.nav-button-explore'), 'useCache');
      }
    } else if (event.state.layout === "profile") {
      setHistory = false;
      if (currentLayout === "profile") {
        window.history.back();
      } else {
        nurl("profile", document.querySelector('.nav-button-profile'), 'useCache');
      }
    } else if (event.state.layout === "postview") {
      setHistory = false;
      if (currentLayout === "postview") {
        window.history.back();
      } else {
        iurl("viewpost", { pid: event.state.iid });
        setItem("currentLayout", "postview");
      }
    }
  } else {
    // No state, just reload the current page
    if (currentLayout === "home") {
      nurl("home", document.querySelector('.nav-button-home'), 'useCache');
    } else if (currentLayout === "friends") {
      nurl("friends", document.querySelector('.nav-button-friends'), 'useCache');
    } else if (currentLayout === "messages") {
      nurl("messages", document.querySelector('.nav-button-messages'), 'useCache');
    } else if (currentLayout === "explore") {
      nurl("explore", document.querySelector('.nav-button-explore'), 'useCache');
    } else if (currentLayout === "profile") {
      nurl("profile", document.querySelector('.nav-button-profile'), 'useCache');
    }
  }
}
// Simple User Interaction Tracker

const Logger = (() => {
  const events = [];

  function logEvent(type, details = {}) {
    const event = {
      type,
      details,
      timestamp: new Date().toISOString(),
      url: window.location.pathname
    };
    events.push(event);
    window.sessionStorage.setItem('EventsLog', events);
    // Optionally: send to server here
    // fetch('/api/track', { method: "POST", body: JSON.stringify(event), headers: {'Content-Type': 'application/json'} });
  }

  // Track scroll
  window.addEventListener('scroll', () => {
    logEvent('scroll', {
      scrollY: window.scrollY,
      scrollX: window.scrollX
    });
  }, { passive: true });

  // Expose events for debugging or sending in batch
  return {
    getEvents: () => events,
    logEvent
  };
})();

// Usage example:
// UserTracker.getEvents() to see tracked events
// UserTracker.logEvent('custom', {foo: 'bar'});

function checkAndSetHistory(page) {
  const state = window.history.state;
  if (state && state.layout == page) {
    setHistory = false;
  } else {
    setHistory = true;
  }
}
function autoScrollPosts(containerSelector = '#posts', speed = 1) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  let animationFrameId;
  let isUserTouching = false;

  // Touch events to pause/resume autoscroll on user interaction
  container.addEventListener('touchstart', () => { isUserTouching = true; }, { passive: true });
  container.addEventListener('touchend', () => {
    isUserTouching = false;
    if (container.scrollTop + container.clientHeight < container.scrollHeight) {
      scrollDown();
    }
  }, { passive: true });

  function scrollDown() {
    if (isUserTouching) return;
    // Only scroll if not at the bottom
    if (container.scrollTop + container.clientHeight < container.scrollHeight) {
      container.scrollTop += speed;
      animationFrameId = requestAnimationFrame(scrollDown);
    }
  }

  // Start scrolling
  scrollDown();

  // Return a function to stop autoscroll if needed
  return () => cancelAnimationFrame(animationFrameId);
}

// Usage example:
// autoScrollPosts('.posts-list', 1); // 1 pixel per frame, adjust speed as needed
function Reload(item) {
  $(".overlay-page").style.display = "none";
  window.sessionStorage.clear();
  window.location.reload();
  AUi(false);
}

function reloadImage(img) {
  img.onerror = null
  let url = new URL(img.src)
  url.searchParams.set('reload', 'true')
  img.src = url.toString()
}

function imgError(img) {
  img.src = `${_server_cdn}/get/image/${bodyData.user_id}/test/1/thumb.jpg`;
  reloadImage(img)
}

function loadImageWithPreview(img, lowResSrc, highResSrc) {
  // Set low-res first
  img.src = lowResSrc;
  img.classList.add('media-fadein');
  img.style.filter = 'blur(4px)';
  img.style.transition = 'filter 0.2s, opacity 0.1s';

  // Preload high-res
  const highResImg = new window.Image();
  highResImg.src = highResSrc;
  highResImg.onload = function () {
    img.src = highResSrc;
    img.style.filter = 'blur(0)';
    img.classList.add('loaded');
  };
}

function onImgLoad(img, src) {
  if (!img.id || img.id === "p-media") {
    img.id = "image-" + Math.random().toString(36).substr(2, 9) + "-" + Date.now();
  }
  // Use the data-src attribute as the real source
  src = img.getAttribute('data-src') || src;
  if (!src) return; 0
  let url = new URL(src)
  src = url.toString()

  // Helper to check if element is in viewport
  function isInView(el) {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  // Show a custom blank SVG placeholder (same size as image)
  function showPlaceholder() {
    if (!img.dataset.placeholder) {
      const width = img.width || img.getAttribute('width') || img.clientWidth || 100;
      const height = img.height || img.getAttribute('height') || img.clientHeight || 100;
      const blankSvg = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'><rect width='100%' height='100%' fill='%23f0f0f0'/></svg>`;
      img.src = blankSvg;
      img.dataset.placeholder = "true";
    }
  }

  function loadImage() {
    if (img.dataset.loaded === "true") return;
    if (!isInView(img)) return;

    // Only show placeholder if not loaded yet

    // Set a blurred placeholder if not already set
    showPlaceholder();

    // Start loading the real image
    const dImg = new window.Image();
    dImg.onload = function () {
      loadImageWithPreview(img, dImg.src, src);
      img.dataset.loaded = "true";
      img.classList.remove("img-loading");
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    dImg.onerror = function () {
      showPlaceholder();

      // img.src = `${_server_cdn}/get/image/${bodyData.user_id}/test/1/thumb.jpg`;
    };
    img.onerror = function () {
      showPlaceholder();

      // img.src = `${_server_cdn}/get/image/${bodyData.user_id}/test/1/thumb.jpg`;
    }
    img.classList.add("img-loading");
    dImg.src = src;

  }



  function onScroll() {
    loadImage();
  }

  loadImage();

  // If not loaded, listen for scroll/resize to try again
  if (img.dataset.loaded !== "true") {
    window.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onScroll);
  } else {
    // If already loaded, remove listeners
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    img.dataset.loaded = "true";
    img.style.filter = 'blur(0)';
    img.classList.add('loaded');
    img.classList.remove("img-loading");
  }
}

function getCanvasPlaceholderColor() {
  // Try to get the CSS variable --container-background or fallback to a default
  const root = document.documentElement;
  let color = getComputedStyle(root).getPropertyValue('--canvas-background').trim();
  if (!color) color = '#222'; // fallback for dark
  // Optionally, check for dark mode and use a different variable
  if (root.getAttribute('color-mode') === 'light') {
    let lightColor = getComputedStyle(root).getPropertyValue('--canvas-background').trim();
    if (lightColor) color = lightColor;
  }
  return color;
}

function renderImageOnCanvasLazy(canvas, imageUrl) {
  // Set placeholder color from CSS variable
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = getCanvasPlaceholderColor();
  ctx.fillRect(0, 0, canvas.width || 320, canvas.height || 180);

  // Lazy load observer
  const loadObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !canvas._imgLoaded) {
        const img = new window.Image();
        //img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        img.onload = function () {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas._imgLoaded = true;
        };
        img.onerror = function () {
          // Optionally, show an error placeholder
        };
        observer.unobserve(canvas);
      }
    });
  }, {
    root: null,
    rootMargin: '100px',
    threshold: 0.2
  });

  loadObserver.observe(canvas);
}

// 1. Global reference for exclusive playback
let currentPlayingCanvas = null;

// 2. Global observer for pausing/resuming canvas videos
const canvasVideoVisibilityObserver = new IntersectionObserver((entries) => {

  entries.forEach(entry => {
    const canvas = entry.target;
    if (canvas._video) {
      if (entry.isIntersecting) {
        if (canvas._video.paused && !canvas._video.ended) {
          canvas._video.play();
        }
      } else {
        if (!canvas._video.paused) {
          canvas._video.pause();
        }
      }
    }
  });
}, {
  root: null,
  rootMargin: '-120px',
  threshold: 0.2
});

// 3. Lazy load and render video on canvas, with exclusive playback
function renderVideoOnCanvasLazy(canvas, videoSrc, options = {}) {
  // Set a placeholder (e.g., gray background)
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = getCanvasPlaceholderColor();
  ctx.fillRect(0, 0, canvas.width || 320, canvas.height || 180);

  function videoAc($video, $canvas) {

    $video.onloadeddata = function () {
      videoActions($video, $canvas, document.querySelectorAll('.post-preview-video-actions'), 'show', 6000);
    };

    const container = $canvas.parentNode;
    const $progress = container ? container.querySelector('.progress') : null;
    const timeLeft = container ? container.querySelector('.player-time-progress-left') : null;
    const timeRight = container ? container.querySelector('.player-time-progress-right') : null;

    // Helper to format seconds as mm:ss
    function formatTime(sec) {
      sec = Math.floor(sec);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function setProgress(e) {
      const time = e.offsetX / $progress.value; // get percentage where clicked and devide by duration
      percent = ($video.currentTime / $video.duration) * 100;
      if ($progress) $progress.style.background = `linear-gradient(90deg, rgba(238, 29, 82, 1) ${percent}%, rgba(0, 0, 0, 0.4) ${percent}%)`;
      $video.currentTime = time * $video.duration;
    }

    // Update progress bar and duration when metadata is loaded
    $video.addEventListener('loadedmetadata', function () {
      if ($progress) {
        $progress.max = $video.duration;
        $progress.step = $video.duration > 0 ? Math.max($video.duration / 100, 0.01) : 0.01;
        $progress.value = 0;
      }
      if (timeRight) timeRight.textContent = formatTime($video.duration);
      if (timeLeft) timeLeft.textContent = formatTime($video.currentTime);
    });

    // Update current time and progress bar while playing
    $video.addEventListener('timeupdate', function () {
      if (timeLeft) timeLeft.textContent = formatTime($video.currentTime);
      if (timeRight && !isNaN($video.duration)) timeRight.textContent = formatTime($video.duration);
      if ($progress) $progress.value = $video.currentTime;
      // Update the background to simulate progress
      percent = ($video.currentTime / $video.duration) * 100;
      if ($progress) $progress.style.background = `linear-gradient(90deg, rgba(238, 29, 82, 1) ${percent}%, rgba(0, 0, 0, 0.4) ${percent}%)`;
    });

    // Allow seeking via progress bar
    if ($progress) {
      $progress.addEventListener("input", function () {
        $video.currentTime = parseFloat($progress.value);
      });
    }

    $progress.addEventListener("input", function () {
      $video.currentTime = parseFloat($progress.value);
    });

    $progress.addEventListener("click", setProgress);

  }

  // Lazy load observer
  const loadObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !canvas._video) {
        const video = document.createElement('video');
        video.src = videoSrc;
        //video.crossOrigin = 'anonymous';
        video.muted = options.muted !== undefined ? options.muted : true;
        //video.playsInline = true;
        video.autoplay = !!options.autoplay;
        video.loop = !!options.loop;
        //video.preload = 'auto';
        video.style.display = 'none';
        document.body.appendChild(video);

        video.addEventListener('loadedmetadata', function () {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        });

        function drawFrame() {
          if (!video.paused && !video.ended) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            requestAnimationFrame(drawFrame);
          }
        }

        if (options.controls == true) {
          videoAc(video, canvas);
        }

        video.addEventListener('play', function () {
          // Pause any other playing video
          if (currentPlayingCanvas && currentPlayingCanvas !== canvas && currentPlayingCanvas._video) {
            currentPlayingCanvas._video.pause();
          }
          currentPlayingCanvas = canvas;
          drawFrame();
        });

        video.addEventListener('pause', function () {
          if (currentPlayingCanvas === canvas) {
            currentPlayingCanvas = null;
          }
        });

        video.addEventListener('ended', function () {
          if (!options.loop) {
            video.currentTime = 0.1;
            video.pause();
          }
          if (currentPlayingCanvas === canvas && options.loop) {
            currentPlayingCanvas = null;
          }
        });

        canvas._video = video;
        canvasVideoVisibilityObserver.observe(canvas); // Global observer
        observer.unobserve(canvas);
      }
    });
  }, {
    root: null,
    rootMargin: '100px',
    threshold: 0.2
  });

  loadObserver.observe(canvas);
}


function createVideoElement(av1Src, fallbackSrc, poster) {
  const video = document.createElement('video');
  if (poster) video.poster = poster;
  video.setAttribute('data-src', `${_server_cdn}/get/video/${bodyData.user_id}/video/1/postsample.mp4`);

  const av1Source = document.createElement('source');
  av1Source.src = av1Src;
  av1Source.type = 'video/webm; codecs=av01.0.05M.08';
  video.appendChild(av1Source);

  if (fallbackSrc) {
    const fallbackSource = document.createElement('source');
    fallbackSource.src = fallbackSrc;
    fallbackSource.type = 'video/mp4';
    video.appendChild(fallbackSource);
  }

  return video;
}

function loadVideoWithPreview(videoEl, lowResPoster, highResSrc) {
  // Set low-res poster first
  const width = videoEl.width || videoEl.getAttribute('width') || videoEl.clientWidth || 320;
  const height = videoEl.height || videoEl.getAttribute('height') || videoEl.clientHeight || 180;
  const blankSvg = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'><rect width='100%' height='100%' fill='%23222222'/></svg>`;
  videoEl.poster = blankSvg;
  videoEl.dataset.placeholder = "true";
  videoEl.classList.add('media-fadein');
  videoEl.style.filter = 'blur(4px)';
  videoEl.style.transition = 'filter 0.2s, opacity 0.1s';

  // Preload video metadata (not full video for performance)
  //videoEl.src = highResSrc;
  //videoEl.load();

  videoEl.addEventListener('loadeddata', function handleLoaded() {
    videoEl.style.filter = 'blur(0)';
    videoEl.classList.add('loaded');
    videoEl.removeEventListener('loadeddata', handleLoaded);
  });
}

function lazyLoadVideos(videos) {

  const onIntersection = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const video = entry.target;
        if (!video.src) {
          video.src = video.getAttribute('data-src');
          video.load();
          video.dataset.loaded = "true";
          observer.unobserve(video);
        }
      }
    });
  };

  const observer = new IntersectionObserver(onIntersection, {
    root: null,
    rootMargin: '100px', // start loading a bit before fully in view
    threshold: 0.2
  });

  videos.forEach(video => {
    try {
      // Remove scroll/resize event listeners for autoplay logic
      // (Assumes handleScrollAutoplay was defined in onVidLoad closure)
      // We'll use a property to store the handler reference for removal
      if (video._scrollHandler) {
        window.removeEventListener("scroll", video._scrollHandler);
        window.removeEventListener("resize", video._scrollHandler);
        delete video._scrollHandler;
      }
      video.pause();
    } catch (e) { }
    onVidLoad(video, video.getAttribute('data-src'), false);
    observer.observe(video);
  });
}

function onVidLoad($video, $src, controls) {
  $video.addEventListener('loadedmetadata', function () {
    //canAutoplay = $video.duration <= 25;
    // If not allowed to autoplay, pause and reset
    //if (!canAutoplay) {
    //  $video.pause();
    //  $video.currentTime = 0;
    //}
    $video.dataset.loaded = "true";
  });

  /*
  $video.addEventListener("ended", function () {
    const rect = $video.getBoundingClientRect();
    const inView = rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
    if (inView && loopCount < 1) {
      setTimeout(() => {
        loopCount++;
        $video.currentTime = 0;
        $video.play();
      }, 2000);
    } else {
      // Pause after 2 loops
      $video.pause();
      $video.currentTime = 0;
    }
  });


  if (controls == false) {
    $video._scrollHandler = handleScrollAutoplay;
    $video.removeEventListener("scroll", $video._scrollHandler);
    // $video.removeEventListener("resize", $video._scrollHandler);

    window.addEventListener("scroll", handleScrollAutoplay);
    // window.addEventListener("resize", handleScrollAutoplay);
    handleScrollAutoplay();
  }

  */
  // Controls setup
  if (controls == true) {
    $video.src = srcWithNoCache;
    $video.load();

    $video.removeAttribute("loop");
    $video.setAttribute("preload", "metadata");
    $video.controls = false;
    $video.autoplay = false;
    $video.loop = false;
    $video.muted = false;
    $video.play();
    $video.onloadedmetadata = null;
    $video.ontimeupdate = null;
    loopCount = 2;

    const container = $video.parentNode;
    const $progress = container ? container.querySelector('.progress') : null;
    const timeLeft = container ? container.querySelector('.player-time-progress-left') : null;
    const timeRight = container ? container.querySelector('.player-time-progress-right') : null;

    // Helper to format seconds as mm:ss
    function formatTime(sec) {
      sec = Math.floor(sec);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function setProgress(e) {
      const time = e.offsetX / $progress.value; // get percentage where clicked and devide by duration
      percent = ($video.currentTime / $video.duration) * 100;
      if ($progress) $progress.style.background = `linear-gradient(90deg, rgba(105, 201, 208, 1) ${percent}%, rgba(0, 0, 0, 0.4) ${percent}%)`;
      $video.currentTime = time * $video.duration;
    }

    // Update progress bar and duration when metadata is loaded
    $video.addEventListener('loadedmetadata', function () {
      if ($progress) {
        $progress.max = $video.duration;
        $progress.step = $video.duration > 0 ? Math.max($video.duration / 100, 0.01) : 0.01;
        $progress.value = 0;
      }
      if (timeRight) timeRight.textContent = formatTime($video.duration);
      if (timeLeft) timeLeft.textContent = formatTime($video.currentTime);
    });

    // Update current time and progress bar while playing
    $video.addEventListener('timeupdate', function () {
      if (timeLeft) timeLeft.textContent = formatTime($video.currentTime);
      if (timeRight && !isNaN($video.duration)) timeRight.textContent = formatTime($video.duration);
      if ($progress) $progress.value = $video.currentTime;
      // Update the background to simulate progress
      percent = ($video.currentTime / $video.duration) * 100;
      if ($progress) $progress.style.background = `linear-gradient(90deg, rgba(238, 29, 82, 1) ${percent}%, rgba(0, 0, 0, 0.4) ${percent}%)`;
    });

    // Allow seeking via progress bar
    if ($progress) {
      $progress.addEventListener("input", function () {
        $video.currentTime = parseFloat($progress.value);
      });
    }

    $progress.addEventListener("input", function () {
      $video.currentTime = parseFloat($progress.value);
    });

    $progress.addEventListener("click", setProgress);

  }
}
function resetAllVideos() {
  // Pause, reset, and remove src from all videos except those inside .overlay-page
  document.querySelectorAll('video').forEach(video => {
    // If the video is NOT inside the overlay-page, reset it
    if (!video.closest('.overlay-page')) {
      video.pause();
      video.currentTime = 0;
      // video.removeAttribute('src');
      // video.removeAttribute('data-loaded');
      // video.dataset.loaded = "false";
      // Optionally, reload metadata to clear frame
      // video.load && video.load();
    }
  });
}
function cleanupVideos(container) {
  if (!container) return;

  const videos = container.querySelectorAll('video');
  videos.forEach(video => {
    try {
      // Remove scroll/resize event listeners for autoplay logic
      // (Assumes handleScrollAutoplay was defined in onVidLoad closure)
      // We'll use a property to store the handler reference for removal
      if (video._scrollHandler) {
        window.removeEventListener("scroll", video._scrollHandler);
        window.removeEventListener("resize", video._scrollHandler);
        delete video._scrollHandler;
      }
      video.pause();
    } catch (e) { }
  });
}
// Automatically clean up videos removed from the DOM
const videoActions = (video, canvas, actionNodes, event, delayMs) => {
  // Helper to show actions
  function showActions() {
    actionNodes.forEach(action => {
      action.style.display = '';
    });
    // Hide after delay (unless video is paused or ended)
    if (delayMs && delayMs > 0 && !video.paused && !video.ended) {
      clearTimeout(video._videoActionsTimeout);
      video._videoActionsTimeout = setTimeout(() => {
        hideActions();
      }, delayMs);
    }
  }

  // Helper to hide actions
  function hideActions() {
    // Only hide if video is playing
    if (!video.paused && !video.ended) {
      actionNodes.forEach(action => {
        action.style.display = 'none';
      });
    }
  }

  // Always show actions if video is paused or ended
  function showIfPausedOrEnded() {
    if (video.paused || video.ended) {
      actionNodes.forEach(action => {
        action.style.display = '';
      });
    }
  }

  // Toggle actions: if visible and video is playing, hide; else show
  function toggleActions() {
    const anyVisible = Array.from(actionNodes).some(action => action.style.display !== 'none');
    if (anyVisible && !video.paused && !video.ended) {
      hideActions();
    } else {
      showActions();
    }
  }

  // Attach listeners only once
  if (!video._videoActionsListeners) {
    canvas.addEventListener('click', toggleActions);
    canvas.addEventListener('touchstart', toggleActions);
    canvas.addEventListener('touchend', () => {
      if (!delayMs || delayMs === 0) hideActions();
    });
    video.addEventListener('pause', showIfPausedOrEnded);
    video.addEventListener('ended', showIfPausedOrEnded);
    // Also show on initial load if video is paused
    if (video.paused) showIfPausedOrEnded();
    video._videoActionsListeners = true;
    canvas._videoActionsListeners = true;
  }

  // Allow manual trigger for hiding
  if (event === "hide") {
    hideActions();
  }
  if (event === "show") {
    showActions();
  }
};

const noop = (e) => {
  e.stopPropagation();
  e.preventDefault()
}

const fullscreen = (e, video) => {
  e.preventDefault()
  e.stopPropagation()
  video.webkitRequestFullScreen();
}

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

const toggleMute = (e, pr) => {
  $video = e.parentElement.querySelector("video");
  if (pr == true) {
    $video = document.querySelector(".post-preview-items-media");
    e = e.children[0];
  } else {
    $video = e.parentElement.querySelector("video");
  }
  delay(100).then(() => {
    if ($video.muted == true) {
      document.querySelectorAll('video').forEach($vid => {
        $vid.muted = true;
        $mute = $vid.parentElement.querySelector(".mute-button");
        $mute.classList.add("fa-volume-mute");
        $mute.classList.remove("fa-volume-up");
      });
      $video.muted = false;
      e.classList.remove("fa-volume-mute");
      e.classList.add("fa-volume-up");
    } else {
      $video.muted = true;
      e.classList.add("fa-volume-mute");
      e.classList.remove("fa-volume-up");
    }
  });
}

function formatRelativeTime(createdAt) {
  try {
    let dateObj;
    if (typeof createdAt === "string") {
      dateObj = new Date(createdAt);
      if (isNaN(dateObj.getTime())) {
        // Try "DD/MM/YYYY HH:mm:ss"
        const parts = createdAt.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
        if (parts) {
          dateObj = new Date(
            parseInt(parts[3]), // year
            parseInt(parts[2]) - 1, // month (0-based)
            parseInt(parts[1]), // day
            parseInt(parts[4]), // hour
            parseInt(parts[5]), // minute
            parseInt(parts[6])  // second
          );
        }
      }
    } else if (createdAt instanceof Date) {
      dateObj = createdAt;
    }

    if (!dateObj || isNaN(dateObj.getTime())) return "Invalid date";

    const now = new Date();
    const diff = Math.floor((now - dateObj) / 1000);

    const days = Math.floor(diff / 86400);
    if (days < 20) {
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${days}d ago`;
    }

    // If 20 days or more, show as "DD/MM/YY"
    return dateObj.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return "Invalid date";
  }
}


const formatTime = (t) => {
  let time = t / 60

  let min = Math.floor(time)
  let sec = Number(Math.floor((time - min) * 60)).toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })

  return new String(min + ":" + sec)
}

const StoryViewManager = (() => {
  let currentIndex = 0;
  let stories = [];
  let progressInterval = null;
  let progress = 0;
  let autoAdvanceMs = 7000; // 7 seconds per story
  let isPaused = false;
  let storiesCache = [];

  function getStoryElements() {
    return Array.from(document.querySelectorAll('.storyview-overlay'));
  }

  function loadStoriesCache() {
    // Load stories from sessionStorage (used by stories() and iurl)
    let cached = window.sessionStorage.getItem("stories");
    if (cached) {
      try {
        storiesCache = JSON.parse(cached);
      } catch (e) {
        storiesCache = [];
      }
    } else {
      storiesCache = [];
    }
  }

  function getCurrentStoryId() {
    if (!stories[currentIndex]) return null;
    return stories[currentIndex].getAttribute('data-story-id');
  }

  function showStory(index) {
    stories.forEach((el, i) => {
      el.style.display = i === index ? 'flex' : 'none';
    });
    currentIndex = index;
    resetProgress();
    startProgress();
    updateNavButtons();
  }

  function nextStory() {
    // Try to move to next DOM story overlay
    if (currentIndex < stories.length - 1) {
      showStory(currentIndex + 1);
    } else {
      // Try to load next story from stories cache
      loadStoriesCache();
      const currentStoryId = getCurrentStoryId();
      const idxInCache = storiesCache.findIndex(s => String(s.story_id) === String(currentStoryId));
      if (idxInCache !== -1 && idxInCache < storiesCache.length - 1) {
        // Next story exists in cache, create and show it
        const nextStoryObj = storiesCache[idxInCache + 1];
        const overlay = document.querySelector('.overlay-page');
        if (overlay) {
          overlay.innerHTML = '';
          overlay.appendChild(createStoryViewElement(nextStoryObj));
          // Re-query overlays and update stories array
          stories = getStoryElements();
          showStory(stories.length - 1);
        }
      } else {
        // No more stories, close
        closeStoryView();
      }
    }
  }

  function prevStory() {
    if (currentIndex > 0) {
      showStory(currentIndex - 1);
    } else {
      // Try to load previous story from stories cache
      loadStoriesCache();
      const currentStoryId = getCurrentStoryId();
      const idxInCache = storiesCache.findIndex(s => String(s.story_id) === String(currentStoryId));
      if (idxInCache > 0) {
        const prevStoryObj = storiesCache[idxInCache - 1];
        const overlay = document.querySelector('.overlay-page');
        if (overlay) {
          overlay.innerHTML = '';
          overlay.appendChild(createStoryViewElement(prevStoryObj));
          stories = getStoryElements();
          showStory(stories.length - 1);
        }
      }
    }
  }

  function closeStoryView() {
    const overlays = document.querySelectorAll('.storyview-overlay');
    overlays.forEach(overlay => overlay.remove());
    clearInterval(progressInterval);
  }

  function resetProgress() {
    progress = 0;
    updateProgressBar(0);
    clearInterval(progressInterval);
  }

  function startProgress() {
    clearInterval(progressInterval);
    progress = 0;
    updateProgressBar(0);
    progressInterval = setInterval(() => {
      if (!isPaused) {
        progress += 100 / (autoAdvanceMs / 100);
        updateProgressBar(progress);
        if (progress >= 100) {
          clearInterval(progressInterval);
          nextStory();
        }
      }
    }, 100);
  }

  function updateProgressBar(val) {
    const bar = stories[currentIndex].querySelector('.storyview-progress-fill');
    if (bar) bar.style.width = `${Math.min(val, 100)}%`;
  }

  function updateNavButtons() {
    const nav = stories[currentIndex].querySelector('.storyview-nav');
    if (!nav) return;
    nav.querySelector('.storyview-nav-btn[title="Previous Story"]').disabled = false;
    nav.querySelector('.storyview-nav-btn[title="Next Story"]').disabled = false;
  }

  function pause() { isPaused = true; }
  function resume() { isPaused = false; }

  function handleKey(e) {
    if (e.key === "ArrowRight") nextStory();
    if (e.key === "ArrowLeft") prevStory();
    //if (e.key === "Escape") closeStoryView();
  }

  function handleTouch() {
    let startX = 0;
    let endX = 0;
    document.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
    });
    document.addEventListener('touchend', e => {
      endX = e.changedTouches[0].clientX;
      if (endX - startX > 50) prevStory();
      if (startX - endX > 50) nextStory();
    });
  }

  function handleMediaPauseResume(storyEl) {
    // Pause progress on video play, resume on pause
    const video = storyEl.querySelector('video.storyview-media');
    if (video) {
      video.addEventListener('play', pause);
      video.addEventListener('pause', resume);
      video.addEventListener('ended', nextStory);
    }
  }

  function handleActions(storyEl) {
    // Like button
    const likeBtn = storyEl.querySelector('.storyview-action-btn .fa-heart');
    if (likeBtn) {
      likeBtn.parentElement.onclick = function () {
        this.classList.toggle('liked');
        // Optionally: send like to server
      };
    }
  }

  function init() {
    stories = getStoryElements();
    if (!stories.length) return;
    loadStoriesCache();
    // Find the current story index in cache and DOM
    let currentStoryId = stories[0].getAttribute('data-story-id');
    let idxInCache = storiesCache.findIndex(s => String(s.story_id) === String(currentStoryId));
    if (idxInCache !== -1) currentIndex = 0;

    stories.forEach((storyEl, idx) => {
      // Navigation
      const prevBtn = storyEl.querySelector('.storyview-nav-btn[title="Previous Story"]');
      const nextBtn = storyEl.querySelector('.storyview-nav-btn[title="Next Story"]');
      if (prevBtn) prevBtn.onclick = prevStory;
      if (nextBtn) nextBtn.onclick = nextStory;
      // Close
      const closeBtn = storyEl.querySelector('.storyview-close-btn');
      if (closeBtn) closeBtn.onclick = closeStoryView;
      // Pause/resume on hold
      storyEl.addEventListener('touchstart', pause);
      storyEl.addEventListener('mouseup', resume);
      storyEl.addEventListener('touchend', resume);
      // Touch navigation
      handleTouch();
      // Media pause/resume
      handleMediaPauseResume(storyEl);
      // Actions
      handleActions(storyEl);
    });
    // Keyboard navigation
    document.addEventListener('keydown', handleKey);
    // Show first story
    showStory(currentIndex);
  }

  return { init, nextStory, prevStory, closeStoryView, pause, resume };
})();

function drawVid(video, canvas, img) {
  var context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  var dataURL = canvas.toDataURL();
  img.setAttribute('src', dataURL);
}

// Video functions end


function setVars() {
  setItem("NetStatus", 0);
  setItem("cA", 0);
  setItem("msg-notif", 0);
  setItem("lang", "en-US");
}

// Set and get encrypted values
function setItem(iname, ivalue) {
  localStorage.setItem(iname, ivalue);
  //  localStorage.setItem(iname, encrypt(ivalue, key));
}

function getItem(i) {
  var itm = localStorage.getItem(i);
  if (itm != null) {
    return itm;
    //     return decrypt(itm, key);
  } else {
    return "";
  }
}
function getCookie(name) {
  let matches = document.cookie.match(new RegExp(
    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
  ));
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

function setCookie(name, value, attributes = {}) {

  attributes = {
    path: '/',
    // add other defaults here if necessary
    ...attributes
  };

  if (attributes.expires instanceof Date) {
    attributes.expires = attributes.expires.toUTCString();
  }

  let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);

  for (let attributeKey in attributes) {
    updatedCookie += "; " + attributeKey;
    let attributeValue = attributes[attributeKey];
    if (attributeValue !== true) {
      updatedCookie += "=" + attributeValue;
    }
  }

  document.cookie = updatedCookie;
}

function deleteCookie(name) {
  setCookie(name, "", {
    'max-age': -1
  })
}




function LogOut(s) {
  setItem("LOGGEDIN", "false");
  setItem("Passwd", "");
  localStorage.clear();
  window.sessionStorage.clear();
  LoginPg();
}

function changeTheme() {
  var currentTheme = getItem("color-mode");
  if (currentTheme == "light") {
    document.documentElement.setAttribute("color-mode", "dark");
    // Sets the user's preference in local storage
    setItem("color-mode", "dark");
    //JSInterface.setAppTheme("dark");
    return;
  } else if (currentTheme == "dark") {
    document.documentElement.setAttribute("color-mode", "light");
    // Sets the user's preference in local storage
    setItem("color-mode", "light");
    //JSInterface.setAppTheme("light");
    return;
  };
};

function rmv() {
  $(".posts").style.display = "none";
};
function addLineBreaks(str, maxLineLength) {
  let result = '';
  let lineLength = 0;
  for (let i = 0; i < str.length; i++) {
    result += str[i];
    lineLength++;
    if (lineLength >= maxLineLength && str[i] === ' ') {
      result += '\n';
      lineLength = 0;
    }
  }
  return result;
}

function purseTime(datet) {
  preDateTime = new Date(datet);
  newTime = preDateTime.toLocaleTimeString('en-US');
  hour = newTime.split(":")[0];
  amPm = newTime.split(" ")[1];
  seconds = newTime.split(":")[2].replace(amPm, '');
  noAmPm = newTime.replace(amPm, '');
  time = noAmPm.replace(":" + seconds, '');
  //    noSeconds = newTime.replace(":"+seconds,' ');
  return time
}

function addlike(lkbtn, pid) {
  var layout = getItem("currentLayout");
  if (layout) {
    lkbtn.classList.add("clicked");
    lkbtn.querySelector('.like-icon').classList.add('fas');
    lkbtn.querySelector('.like-icon').classList.remove('far');
    n = fetch(_server + "/like?pid=" + pid + "&c=Ceera.1.0 (Android >=8.0)&n=" + UserName + "&p=" + PassWd, { cache: "no-cache" })
    n.then(response => response.text())
      .then(data => {
        var arr = data.split(',');
        if (arr[0] == "true") {
          lkbtn.querySelector('.likes-count').textContent++;
        } else {
          lkbtn.classList.remove("clicked");
          lkbtn.querySelector('.like-icon').classList.add('far');
          lkbtn.querySelector('.like-icon').classList.remove('fas');
          lkbtn.querySelector('.likes-count').textContent--;
        }
      });
  }
};

function BackTo(page, cache) {
  var layout = getItem("currentLayout");
  window.history.back();
};

function foryouposts(state) {
  var currentPage = getItem("currentLayout");
  cachedPosts = window.sessionStorage.getItem("home_posts");
  bodyData.page = "foryouposts";

  if (currentPage) {
    if (state == "useCache" && cachedPosts) {
      // the posts were cached
      // get posts from cache and set them to local state
      $("#posts").innerHTML = cachedPosts;
      const videos = $("#posts").querySelectorAll('video[data-src]');
      videos.forEach(video => {
        video.pause();
        video.removeAttribute('src');
        video.removeAttribute('data-loaded');
        video.dataset.loaded = "false";
        video.currentTime = 0;
        onVidLoad(video, video.getAttribute('data-src'), false);
      });
      $("#c140").style.display = "none";
    } else {
      // the posts are not cached, so execute an api request to fetch them
      // then get first batch of posts from DB to display them in home page

      n = fetchData("/page/f", "POST", bodyData, "no-cache");
      n.then(response => response.text())
        .then(data => {
          $("#posts").innerHTML = data;
          const videos = $("#posts").querySelectorAll('video[data-src]');
          videos.forEach(video => {
            video.pause();
            video.removeAttribute('src');
            video.removeAttribute('data-loaded');
            video.dataset.loaded = "false";
            video.currentTime = 0;
            onVidLoad(video, video.getAttribute('data-src'), false);
          });
          $("#c140").style.display = "none";
          window.sessionStorage.setItem("home_posts", data);
        });
    };
  };
};


function switchRollsMode(mode) {
  // Remove any previous rolls-mode-* class from body
  document.body.classList.forEach(cls => {
    if (cls.startsWith('rolls-mode-')) {
      document.body.classList.remove(cls);
    }
  });
  // Add the new mode class if not default
  if (mode && mode !== 'default') {
    document.body.classList.add('rolls-mode-' + mode);
  }
  // Add mode to all elements with rolls-mode or rolls-mode-btn in their class
  document.querySelectorAll('.rolls').forEach(el => {
    // Remove previous rolls-mode-* classes
    el.classList.forEach(cls => {
      if (cls.startsWith('rolls-mode-')) {
        el.classList.remove(cls);
      }
    });
    // Add the new mode class if not default
    if (mode && mode !== 'default') {
      el.classList.add('rolls-mode-' + mode);
    }
  });
  // Optionally, store the mode for persistence
  setItem('rolls-mode', mode);
}

function applyRollsModeClass(el) {
  var mode = getItem('rolls-mode');
  if (mode && mode !== 'default') {
    // Only add if the element has "rolls" in its className
    if (el.className && el.className.indexOf('rolls') !== -1) {
      el.classList.add('rolls-mode-' + mode);
    }
  }
}

function createAppSettingsElement() {
  const fragment = document.createDocumentFragment();
 
  // Main container
  const container = document.createElement('div');
  container.className = 'app-settings-container';

  // Title
  const title = document.createElement('h2');
  title.className = 'settings-title';
  title.textContent = 'Settings';
  container.appendChild(title);

  // Theme Mode Setting
  const themeSection = document.createElement('div');
  themeSection.className = 'settings-section';
  const themeLabel = document.createElement('label');
  themeLabel.textContent = 'Theme Mode:';
  const themeSelect = document.createElement('select');
  themeSelect.className = 'settings-theme-select';
  ['System', 'Light', 'Dark'].forEach(mode => {
    const opt = document.createElement('option');
    opt.value = mode.toLowerCase();
    opt.textContent = mode;
    themeSelect.appendChild(opt);
  });
  themeSelect.value = (getItem("color-mode") || 'system').toLowerCase();
  themeSelect.onchange = function () {
    const mode = themeSelect.value;
    if (mode === 'system') {
      document.documentElement.removeAttribute('color-mode');
      //JSInterface.setAppTheme(mode);
    } else {
      document.documentElement.setAttribute('color-mode', mode);
      //JSInterface.setAppTheme(mode);
    }
    setItem('color-mode', mode);
  };
  themeSection.appendChild(themeLabel);
  themeSection.appendChild(themeSelect);

  // Rolls Mode Customization
  const customizeBtn = document.createElement('button');
  customizeBtn.className = 'settings-customize-theme-btn';
  customizeBtn.textContent = 'Customize Theme';
  themeSection.appendChild(customizeBtn);

  const rollsModeDiv = document.createElement('div');
  rollsModeDiv.className = 'settings-rolls-mode';
  rollsModeDiv.style.display = 'none'; // Hidden by default

  const rollsLabel = document.createElement('label');
  rollsLabel.textContent = 'UI Mode (Rolls Mode):';
  rollsModeDiv.appendChild(rollsLabel);

  // Example Rolls Mode options (add more as needed)
  ['Default', 'Rolls'].forEach(mode => {
    const btn = document.createElement('button');
    btn.className = 'rolls-mode-btn';
    btn.textContent = mode;
    btn.onclick = function () {
      setItem('rolls-mode', mode.toLowerCase());
      // Optionally, update UI immediately
    };
    rollsModeDiv.appendChild(btn);
  });
  customizeBtn.onclick = function () {
    rollsModeDiv.style.display = rollsModeDiv.style.display === 'none' ? 'block' : 'none';
  };

  themeSection.appendChild(rollsModeDiv);
  container.appendChild(themeSection);

  // Privacy Setting
  const privacySection = document.createElement('div');
  privacySection.className = 'settings-section';
  const privacyLabel = document.createElement('label');
  privacyLabel.textContent = 'Account Privacy:';
  const privacySelect = document.createElement('select');
  privacySelect.className = 'settings-privacy-select';
  ['Public', 'Private', 'Friends Only'].forEach(level => {
    const opt = document.createElement('option');
    opt.value = level.toLowerCase().replace(' ', '-');
    opt.textContent = level;
    privacySelect.appendChild(opt);
  });
  privacySelect.value = (getItem('privacy-setting') || 'public').toLowerCase();
  privacySelect.onchange = function () {
    setItem('privacy-setting', privacySelect.value);
  };
  privacySection.appendChild(privacyLabel);
  privacySection.appendChild(privacySelect);
  container.appendChild(privacySection);

  // Notifications Setting
  const notifSection = document.createElement('div');
  notifSection.className = 'settings-section';
  const notifLabel = document.createElement('label');
  notifLabel.textContent = 'Enable Notifications:';
  const notifToggle = document.createElement('input');
  notifToggle.type = 'checkbox';
  notifToggle.checked = getItem('notifications-enabled') === '1';
  notifToggle.onchange = function () {
    setItem('notifications-enabled', notifToggle.checked ? '1' : '0');
  };
  notifSection.appendChild(notifLabel);
  notifSection.appendChild(notifToggle);
  container.appendChild(notifSection);

  // Language Setting
  const langSection = document.createElement('div');
  langSection.className = 'settings-section';
  const langLabel = document.createElement('label');
  langLabel.textContent = 'Language:';
  const langSelect = document.createElement('select');
  langSelect.className = 'settings-language-select';
  ['English', 'Spanish', 'French', 'German'].forEach(lang => {
    const opt = document.createElement('option');
    opt.value = lang.toLowerCase();
    opt.textContent = lang;
    langSelect.appendChild(opt);
  });
  langSelect.value = (getItem('lang') || 'english').toLowerCase();
  langSelect.onchange = function () {
    setItem('lang', langSelect.value);
  };
  langSection.appendChild(langLabel);
  langSection.appendChild(langSelect);
  container.appendChild(langSection);

  fragment.appendChild(container);
  return fragment;
}


const searchFocus = (searchInput) => {
  // All selectors are resolved fresh on each call for robustness
  const getEls = () => ({
    homeSearchContainer: document.querySelector('.home-search-container'),
    homePostsFiltersContainer: document.querySelector('.home-posts-filters-container'),
    homePostsicsContainer: document.querySelector('.home-search-ics-container'),
    aiSearchIcr: document.querySelector('.ics-home-inline'),
    stories: document.querySelector('.stories'),
    topNav: document.querySelector('#nav'),
    posts: document.querySelector('.posts')
  });

  const addFocus = () => {
    const {
      homeSearchContainer,
      homePostsFiltersContainer,
      homePostsicsContainer,
      aiSearchIcr,
      stories,
      topNav,
      posts
    } = getEls();

    if (homeSearchContainer) homeSearchContainer.classList.add('search-active');
    if (homePostsFiltersContainer) homePostsFiltersContainer.style.display = 'none';
    if (aiSearchIcr) aiSearchIcr.style.display = 'none';
    if (homeSearchContainer) {
      homeSearchContainer.style.position = 'sticky';
      homeSearchContainer.style.top = '0';
      homeSearchContainer.style.zIndex = '100';
    }
    if (stories) stories.style.display = 'none';
    if (topNav) topNav.style.display = 'none';
    if (posts) posts.style.display = 'none';
    if (homePostsicsContainer) homePostsicsContainer.style.width = '90%';
  };

  const removeFocus = () => {
    const {
      homeSearchContainer,
      homePostsFiltersContainer,
      homePostsicsContainer,
      aiSearchIcr,
      stories,
      topNav,
      posts
    } = getEls();

    if (homeSearchContainer) homeSearchContainer.classList.remove('search-active');
    if (homePostsFiltersContainer) homePostsFiltersContainer.style.display = '';
    if (aiSearchIcr) aiSearchIcr.style.display = 'block';
    if (homeSearchContainer) {
      homeSearchContainer.style.position = '';
      homeSearchContainer.style.top = '';
      homeSearchContainer.style.zIndex = '';
    }
    if (stories) stories.style.display = 'block';
    if (topNav) topNav.style.display = 'block';
    if (posts) posts.style.display = 'block';
    if (homePostsicsContainer) homePostsicsContainer.style.width = 'fit-content';
  };

  // Collapse on blur (optional, or use a close button)
  searchInput.addEventListener('blur', function () {
    setTimeout(() => {
      removeFocus();
    }, 200);
  });

  /* Optionally, expand on focus
  searchInput.addEventListener('focus', function () {
    addFocus();
  });
  */

  // Server search integration (debounced)
  let searchTimeout;
  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();
    if (query.length < 2) return;
    searchTimeout = setTimeout(() => {
      fetchData('/search', "POST", { query }, 'no-cache')
        .then(response => response.json())
        .then(results => {
          // Implement your own rendering logic for results
          showSearchResults(results);
        });
    }, 300);
  });

  return {
    addFocus,
    removeFocus
  };
};

function showSearchResults(results) {
  // Implement your own rendering logic here
  // For example, show a dropdown or overlay with results
}

// TODO: create a const function to set active tab according to page and last active tab

const tabActions = {
  "For You": (cache) => loadForYouPostsDynamic(cache),
  "Following": (cache) => loadFollowingPosts(cache),
  "Latest": (cache) => loadForYouPostsDynamic(cache), // <<< (temporary) change to  >> loadLatestPosts(cache)
  "Popular": (cache) => loadPopularPosts(cache),
  "Live": (cache) => loadLivePosts(cache),
  "Reels": (cache) => loadReels(cache),
  "V-Logs": (cache) => loadVLogs(cache),
  "All": (cache) => loadChatList(cache), // <<< (temporary) change to >> loadAllInPage(cache) will load all according to current page
  "Unread": (cache) => loadUnreadChats(cache),
  "Groups": (cache) => loadGroups(cache),
  "Suggested": (cache) => loadforyoufriends(cache) // <<< (temporary) change to >> loadSuggested() will suggest according to current page
};

const setActiveTabForPage = (pageName, cache) => {
  const lastActiveTab = getItem(`${pageName}_lastActiveTab`);
  const tabContainer = document.querySelector('.ics-home-inline');
  if (!tabContainer) return;

  const tabs = tabContainer.querySelectorAll('.ai-search-cnt');
  let activatedTabName = null;
  let defaultTab = null;

  tabs.forEach((tab, idx) => {
    const tabNameSpan = tab.querySelector('span');
    const icr = tab.querySelector('.ai-search-icr');
    if (!tabNameSpan || !icr) return;
    icr.classList.remove('active');
    // Find the tab with "default" class
    if (tab.classList.contains('default')) {
      defaultTab = tab;
    }
    // Set 'active' if matches lastActiveTab
    if (lastActiveTab && tabNameSpan.textContent === lastActiveTab) {
      icr.classList.add('active');
      activatedTabName = tabNameSpan.textContent;
    }
  });

  // If no lastActiveTab, activate the tab with "default" class
  if (!lastActiveTab && defaultTab) {
    const icr = defaultTab.querySelector('.ai-search-icr');
    const tabNameSpan = defaultTab.querySelector('span');
    if (icr) icr.classList.add('active');
    if (tabNameSpan) activatedTabName = tabNameSpan.textContent;
  }
  // If still not found, fallback to first tab
  if (!activatedTabName && tabs.length > 0) {
    const icr = tabs[0].querySelector('.ai-search-icr');
    const tabNameSpan = tabs[0].querySelector('span');
    if (icr) icr.classList.add('active');
    if (tabNameSpan) activatedTabName = tabNameSpan.textContent;
  }

  // Only trigger tab action on page load, not on click
  if (activatedTabName && tabActions[activatedTabName]) {
    tabActions[activatedTabName](cache);
  }
};

function tabSetActive(cnt, cache) {
  const inline = cnt.closest('.ics-home-inline');
  if (!inline) return;

  // Remove 'active' from all tabs in this container
  const icrs = inline.querySelectorAll('.ai-search-cnt .ai-search-icr');
  icrs.forEach(icr => icr.classList.remove('active'));

  // Add 'active' to the clicked tab
  const icr = cnt.querySelector('.ai-search-icr');
  if (icr) icr.classList.add('active');

  // Store the last active tab for this page
  const tabName = cnt.querySelector('span');
  const currentPage = getItem("currentLayout");
  if (tabName && currentPage) {
    setItem(`${currentPage}_lastActiveTab`, tabName.textContent);
  }

  // Trigger tab action for the clicked tab only
  if (tabName && tabName.textContent && tabActions[tabName.textContent]) {
    tabActions[activatedTabName](cache);
  }
}

function loadForYouPostsDynamic(state) {
  var currentPage = getItem("currentLayout");
  bodyData.np = 6; // Number of posts to fetch

  if (!currentPage) return;

  // Determine cache key based on page
  const cacheKey = currentPage === "explore" ? "explore_posts_dynamic" : "home_posts_dynamic";
  let cachedPosts = window.sessionStorage.getItem(cacheKey);

  const postsContainer = document.querySelector('#posts');
  const mediaLoader = document.querySelector('.post-media-bottom-loader');

  if (!postsContainer) {
    console.warn("Posts container (#posts) not found in DOM.");
    return;
  }

  // Helper: Render posts array to DOM
  function renderPosts(posts) {
    $("#c140").style.display = "none";
    postsContainer.innerHTML = '';
    posts.forEach(post => {
      if (post.priority === 'ad') return; // Skip ads
      const node = createPostElement(post);
      if (node && node.nodeType) postsContainer.appendChild(node);
    });
    if (mediaLoader) mediaLoader.style.display = "none";
  }

  if (state === "useCache" && cachedPosts) {
    // Use cached posts
    try {
      cachedPosts = JSON.parse(cachedPosts);
      if (!Array.isArray(cachedPosts)) throw new Error("Cached posts not array");
    } catch (e) {
      console.warn("Failed to parse cached posts, falling back to fetch.", e);
      cachedPosts = [];
    }
    renderPosts(cachedPosts);
    return;
  }

  // Fetch posts from API
  fetchData("/query/fyp", "POST", bodyData, "no-cache")
    .then(response => response.json())
    .then(data => {
      if (!Array.isArray(data)) {
        console.warn("Fetched data is not an array.");
        postsContainer.innerHTML = "<div class='no-posts-msg'>No posts found.</div>";
        if (mediaLoader) mediaLoader.style.display = "none";
        return;
      }
      // Filter and validate posts
      const validPosts = data
        .filter(post => post && typeof post === "object" && post.priority !== 'ad')
        .map(post => ({
          post_id: post.post_id || '',
          user: post.user || { user_id: '', first_name: '.', last_name: '' },
          created_at: post.created_at || new Date().toISOString(),
          priority: post.priority || 'public',
          post_tags: post.post_tags || [],
          post_type: post.post_type || 'image',
          content: post.content || '',
          likes: post.likes || 0,
          comments: post.comments || 0,
          forwards: post.forwards || 0
        }));

      if (!validPosts.length) {
        postsContainer.innerHTML = "<div class='no-posts-msg'>No posts found.</div>";
        if (mediaLoader) mediaLoader.style.display = "none";
        return;
      }

      if (validPosts.length) {
        // Save individual post data for quick access
        validPosts.forEach(post => {
          window.sessionStorage.setItem(`postdata${post.post_id}`, JSON.stringify(post));
        });
        renderPosts(validPosts);
        window.sessionStorage.setItem(cacheKey, JSON.stringify(validPosts));
        return;
      }
    })
    .catch(err => {
      console.error("Failed to load posts:", err);
      postsContainer.innerHTML =  `<div class='no-posts-msg'>Failed to load posts. ${err.message}</div>`;
      if (mediaLoader) mediaLoader.style.display = "none";
    });
}

function createPostElement(post) {
  const fragment = document.createDocumentFragment();
  // Main post container
  const postDiv = document.createElement('div');
  postDiv.id = 'mu-post';
  postDiv.className = 'mu-post mt-6 fade-in-on-scroll';
  postDiv.dataset.postid = post.post_id;

  // --- u-dtl ---
  const postTopDetail = document.createElement('div');
  postTopDetail.className = 'post-top-detail rolls-mode-rolls rolls';
  applyRollsModeClass(postTopDetail);

  const uDtl = document.createElement('div');
  uDtl.className = 'post-user-detail';

  // u-media-cnt
  const uMediaCnt = document.createElement('div');
  uMediaCnt.className = 'post-user-media-container';

  uMediaCnt.setAttribute('onclick', "iurl('profileview', {uuid: this.getAttribute('data-uuid') })");
  uMediaCnt.setAttribute('data-uuid', post.user.user_id);
  const canvas = document.createElement('canvas');
  canvas.className = 'post-user-media u-media-avl';
  canvas.width = 320;
  canvas.height = 180;
  renderImageOnCanvasLazy(canvas, `${_server_cdn}/get/image/${bodyData.user_id}/image/1/profilesample.jpg`);
  uMediaCnt.appendChild(canvas);

  const userMeta = document.createElement('div');
  userMeta.className = 'post-user-meta';

  // username
  const usernameDiv = document.createElement('div');
  usernameDiv.className = 'username onclick-blue';
  usernameDiv.setAttribute('onclick', "iurl('profileview', {uuid: this.getAttribute('data-uuid') })");
  usernameDiv.setAttribute('data-uuid', post.user ? post.user.user_id : '');
  usernameDiv.innerHTML = (post.user ? (post.user.first_name + ' ' + post.user.last_name) : 'Unknown') +
    (post.user && post.user.is_verified ? ' <i class="fa fa-check-circle"></i>' : '');
  userMeta.appendChild(usernameDiv);

  // p-date
  const h3 = document.createElement('h2');
  h3.className = 'post-date-time';
  if (post.priority === 'public') {
    h3.innerHTML = `
      <div class="p-date-ago">${formatRelativeTime(post.created_at) || ''}</div>
      <div class="dot"> • </div>
      <div class="icn"><i class="fa fa-globe"></i></div>
      ${post.post_tags && post.post_tags.length ? `<div class="atu"><font color="#e5e5e5"><div class="dot"> • </div></font>@username</div>` : ''}
    `;
  } else if (post.priority === 'ad') {
    h3.innerHTML = `Sponsored <div class='dot'>•</div> ad`;
  } else if (post.priority === 'private') {
    h3.innerHTML = `${formatRelativeTime(post.created_at) || ''} <div class='dot'>•</div> <i class='fa fa-lock'></i>`;
  }
  userMeta.appendChild(h3);

  // p-date


  // post-drpbtn
  const drpBtn = document.createElement('div');
  drpBtn.className = 'post-options-button onclick-blue';
  drpBtn.setAttribute('onclick', "showMenu('home-post-image', {postid: this.getAttribute('data-postid'), username: this.getAttribute('data-username')})");
  drpBtn.setAttribute('data-postid', post.post_id);
  drpBtn.setAttribute('data-username', post.user ? (post.user.first_name + ' ' + post.user.last_name) : 'Unknown');
  drpBtn.textContent = '•••';
  drpBtn.setAttribute('title', 'More options');
  drpBtn.setAttribute('aria-label', 'More options');
  drpBtn.setAttribute('role', 'button');
  drpBtn.setAttribute('tabindex', '0');

  uDtl.appendChild(uMediaCnt);
  uDtl.appendChild(userMeta);

  postTopDetail.appendChild(uDtl);
  const usertag = document.createElement('div');
  usertag.className = 'post-username-tag';
  if (post.priority === 'public') {
    usertag.innerHTML = '<span class="tagged-user-name">@username</span>';
    //postTopDetail.appendChild(usertag);
  }

  postTopDetail.appendChild(drpBtn);

  postDiv.appendChild(postTopDetail);


  // --- post-inner ---
  const postInner = document.createElement('div');
  postInner.className = 'post-inner mb-4';

  // post-caption-container
  if (post.content) {
    const captionContainer = document.createElement('div');

    if (post.priority === 'beta') {
      captionContainer.className = 'post-caption-container rolls-mode-rolls rolls';
      applyRollsModeClass(captionContainer);
      const captionContent = document.createElement('div');
      captionContent.className = 'post-caption-content';
      captionContent.textContent = post.content.substring(0, 64) + (post.content.length > 64 ? '...' : '');
      captionContainer.appendChild(captionContent);
      postInner.appendChild(captionContainer);
      const captionContenttest = document.createElement('span');
      captionContenttest.className = 'post-caption-span-container rolls';
      captionContenttest.textContent = formatRelativeTime(post.created_at) + " • " + (post.user ? post.user.username : 'Unknown');
      postInner.appendChild(captionContenttest);
    } else if ((post.priority === 'ad')) {
      captionContainer.className = 'post-caption-container-short rolls-mode-rolls rolls';
      applyRollsModeClass(captionContainer);
      const captionContent = document.createElement('div');
      captionContent.className = 'post-caption-content-short';
      captionContent.textContent = post.content.substring(0, 64) + (post.content.length > 64 ? '...' : '');
      captionContainer.appendChild(captionContent);
      postInner.appendChild(captionContainer);
      const captionContenttest = document.createElement('span');
      captionContenttest.className = 'post-caption-span-container rolls';
      captionContenttest.textContent = formatRelativeTime(post.created_at) + " • " + (post.user ? post.user.username : 'Unknown');
      postInner.appendChild(captionContenttest);
    } else {
      captionContainer.className = 'post-caption-container-short rolls-mode-rolls rolls';
      applyRollsModeClass(captionContainer);
      const captionContent = document.createElement('div');
      captionContent.className = 'post-caption-content-short';
      captionContent.textContent = post.content.substring(0, 64) + (post.content.length > 64 ? '...' : '');
      captionContainer.appendChild(captionContent);
      postInner.appendChild(captionContainer);
    }
  }

  // p-media-cnt
  const mediaCnt = document.createElement('div');
  mediaCnt.className = 'post-media-container rolls-mode-rolls rolls';
  applyRollsModeClass(mediaCnt);
  if (post.post_type === 'image') {
    const canvas = document.createElement('canvas');
    canvas.className = 'p-media preview';
    canvas.id = 'p-media';
    canvas.width = 320;
    canvas.height = 180;
    renderImageOnCanvasLazy(canvas, `${_server_cdn}/get/image/${bodyData.user_id}/image/1/postsample.jpg`);
    canvas.onclick = function () { iurl('postview', { pid: post.post_id }); };
    mediaCnt.appendChild(canvas);

    // post-media-caption
    const mediaCaption = document.createElement('div');
    mediaCaption.className = 'post-media-caption';
    mediaCaption.setAttribute('onclick', "toggleMore(this, false)");
    mediaCaption.innerHTML = `<span class="post-media-caption-special-tag">${post.user ? post.user.username : ''}</span>
      <div class="post-media-caption-loader"><i class="focus_dot">•</i></div>`;
    mediaCnt.appendChild(mediaCaption);

  } else if (post.post_type === 'video') {
    // --- Begin: Canvas-based video rendering ---
    const canvas = document.createElement('canvas');
    canvas.className = 'p-media preview';
    canvas.id = 'p-media';
    canvas.width = 320; // placeholder size
    canvas.height = 180;
    renderVideoOnCanvasLazy(canvas, `${_server_cdn}/get/video/${bodyData.user_id}/video/1/postsample.mp4`, { autoplay: true, loop: true, muted: true });
    canvas.onclick = function () { iurl('postview', { pid: post.post_id }); };
    mediaCnt.appendChild(canvas);
    // --- End: Canvas-based video rendering ---

    // mute button
    const muteBtn = document.createElement('div');
    muteBtn.className = 'post-media-mute mute-button fa fa-volume-mute';
    muteBtn.setAttribute('onclick', 'toggleMute(this, false)');
    mediaCnt.appendChild(muteBtn);

    // post-media-caption
    const mediaCaption = document.createElement('div');
    mediaCaption.className = 'post-media-caption';
    mediaCaption.setAttribute('onclick', "toggleMore(this, false)");
    mediaCaption.innerHTML = `<span class="post-media-caption-special-tag">00:32 | ${post.user ? post.user.username : ''}</span>
      <div class="post-media-caption-loader"><i class="focus_dot">•</i></div>`;
    mediaCnt.appendChild(mediaCaption);
  } else {
    // THis has to somehow be text
    const img = document.createElement('img');
    img.id = 'p-media';
    img.className = 'p-media preview';
    img.src = `${_server_cdn}/get/image/${bodyData.user_id}/test/1/thumb.jpg`;
    img.setAttribute('data-src', post.post_url || '');
    img.setAttribute('data-pid', post.post_id);
    img.onclick = function () { iurl('postview', { pid: post.post_id }); };
    img.onload = function () { onImgLoad(this, this.getAttribute('data-src')); };
    mediaCnt.appendChild(img);
  }
  postInner.appendChild(mediaCnt);

  // post-tags-container
  if (post.post_tags && post.post_tags.length > 0) {
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'post-tags-container';
    const tagsInner = document.createElement('div');
    tagsInner.className = 'tags-inner';
    post.post_tags.forEach(tag => {
      const tagDot = document.createElement('div');
      tagDot.className = 'tag-dot';
      tagDot.textContent = '•';
      tagsInner.appendChild(tagDot);

      const tagSpan = document.createElement('span');
      tagSpan.className = 'tag-inner-content';
      tagSpan.innerHTML = `<i><span class='tagged-user'>${tag.tag_content}</span></i>`;
      tagsInner.appendChild(tagSpan);
    });
    tagsContainer.appendChild(tagsInner);
    postInner.appendChild(tagsContainer);
  }

  // --- bottom-pst-ics ---
  const bottomPstIcs = document.createElement('div');
  bottomPstIcs.className = 'bottom-pst-ics clear';

  const postBottomContainer = document.createElement('div');
  postBottomContainer.className = 'post-bottom-container rolls-mode-rolls rolls';
  applyRollsModeClass(postBottomContainer);

  // Comment input
  const commentInput = document.createElement('input');
  commentInput.type = 'text';
  commentInput.placeholder = 'Add a comment';
  commentInput.className = 'comment-ipt';
  commentInput.setAttribute('readonly', 'readonly');
  commentInput.setAttribute('data-pid', post.post_id);
  commentInput.onclick = function () { iurl('postview', { pid: post.post_id }); };
  postBottomContainer.appendChild(commentInput);

  const mojiBtn = document.createElement('div');
  mojiBtn.className = 'comment-ipt';
  mojiBtn.innerHTML = `<span class="likes-count"><i class='far fa-thumbs-o-up'></i></span> • <span class="likes-count">@tylerve, + 4 more</span>`;
  //postBottomContainer.appendChild(mojiBtn);

  // Like button
  const likeBtn = document.createElement('div');
  likeBtn.className = 'post-like-button-cover onclick-blue';
  likeBtn.setAttribute('onclick', 'addlike(this, this.getAttribute("data-pid"))');
  likeBtn.setAttribute('data-pid', post.post_id);
  likeBtn.onclick = function () { addPostLike(this, post.post_id ); };
  likeBtn.innerHTML = `<i class="like-icon far fa-thumbs-o-up"></i> <span class="likes-count">${post.likes ? post.likes : 0}</span>`;
  postBottomContainer.appendChild(likeBtn);

  // Comments count
  if (post.comments && post.comments > 0) {
    const commentsBtn = document.createElement('div');
    commentsBtn.className = 'ics-bottom-item-ge onclick-blue';
    commentsBtn.innerHTML = `<i class="comments-icon fa fa-comments-o"></i> ${post.comments}`;
    commentsBtn.onclick = function () { showCommentsView(this, post.post_id ); };
    postBottomContainer.appendChild(commentsBtn);
  }

  // Forwards/share count
  if (post.forwards && post.forwards > 0) {
    const shareBtn = document.createElement('div');
    shareBtn.className = 'ics-bottom-item-ge onclick-blue';
    shareBtn.setAttribute('onclick', 'sharePost(this, this.getAttribute("data-pid"))');
    shareBtn.setAttribute('data-pid', post.post_id);
    shareBtn.innerHTML = `<i class="share-icon fa fa-share"></i> ${post.forwards}`;
    postBottomContainer.appendChild(shareBtn);
  }

  const rankBtn = document.createElement('div');
  rankBtn.className = 'ics-bottom-item-ge onclick-blue';
  rankBtn.setAttribute('onclick', 'sharePost(this, this.getAttribute("data-pid"))');
  rankBtn.innerHTML = `<i class="share-icon fa fa-chart-simple"></i> ${post.views ? post.views : 0}`;
  postBottomContainer.appendChild(rankBtn);

  bottomPstIcs.appendChild(postBottomContainer);
  /*
  if (post.comments && post.comments > 3) {
    const comment = post.comments[0];
    const commentDiv = document.createElement('div');
    commentDiv.className = 'post-bottom-single-comment';
    commentDiv.innerHTML = `
    <span class="comment-user">${comment.user ? (comment.user.first_name || '') + ' ' + (comment.user.last_name || '') : 'User'}</span>
    <span class="comment-content">${comment.content || comment.text || ''}</span>
  `;
    bottomPstIcs.appendChild(commentDiv);
  }
  */
  postInner.appendChild(bottomPstIcs);

  postDiv.appendChild(postInner);

  fragment.appendChild(postDiv);

  return fragment;
}


function showCommentsView(post) {
  // fetch first 20 comments using post.post_id
  // comments returned from fetch
  // comments = from fetch
  // filter comments
  comments.forEach((comment) => {
    const commentsItem = `<div class="comments-item">
					<span class="comment-top">
						<span class="comment-top-logo" style="background-image:url(${_server_cdn}/get/image/${bodyData.user_id}/test/1/thumb.jpg"></span>
						<span class="comment-top-details">
							<span class="user-name">Test User</span>
							<span class="user-time">${formatRelativeTime(comment.created_at)}</span>
							<span class="user-comment">${comment.content}</span>
						</span>
					</span>
				</div>`;
    return commentsItem;
  });
}

function createPostViewElement(post) {

  // Create fragment to hold the post view elements
  const fragment = document.createDocumentFragment();
  // Check if post is valid
  if (!post || !post.post_id) {
    console.error('Invalid post data:', post);
    return fragment; // Return empty fragment if post is invalid
  }
  // Main container
  const preview = document.createElement('div');
  preview.className = 'post-preview';

  // Spacer
  preview.appendChild(document.createElement('div')).className = 'mt-4';

  // Post-cm container
  const postCm = document.createElement('div');
  postCm.id = 'post-cm';
  postCm.className = 'post-cm';
  postCm.dataset.postid = post.post_id;

  // Header
  const header = document.createElement('div');
  header.className = 'imgpreview-header-top';
  header.innerHTML = `
    <div class="bar-btn-gl onclick-blue" onclick="BackTo('home', 'useCache')">
      <i class="fa fa-chevron-left"></i>
    </div>
  `;
  postCm.appendChild(header);

  // Post preview items
  const items = document.createElement('div');
  items.className = 'post-preview-items';

  // Media
  const mediaContainer = document.createElement('div');
  mediaContainer.className = 'post-preview-items-media-container';

  if (post.post_type === "image") {
    const canvas = document.createElement('canvas');
    canvas.className = 'post-preview-items-media';
    canvas.width = 320;
    canvas.height = 180;
    renderImageOnCanvasLazy(canvas, `${_server_cdn}/get/image/${bodyData.user_id}/image/1/postsample.jpg`);
    canvas.onclick = function () { clickImageAIAction('compare', { pid: post.post_id }); };
    mediaContainer.appendChild(canvas);
  } else if (post.post_type === "video") {
    mediaContainer.className = 'post-preview-items-media-video-container';
    const canvas = document.createElement('canvas');
    canvas.className = 'post-preview-items-media';
    canvas.width = 320; // placeholder size
    canvas.height = 180;
    renderVideoOnCanvasLazy(canvas, `${_server_cdn}/get/video/${bodyData.user_id}/video/1/postsample.mp4`, { autoplay: true, loop: false, muted: false, controls: true });
    //canvas.onclick = function () { iurl('postview', { pid: post.post_id }); };
    mediaContainer.appendChild(canvas);

    // Video controls/actions (simplified)
    const actions = document.createElement('div');
    actions.className = 'player-actions post-preview-video-actions';
    actions.innerHTML = `
      <div class="media-button" hidden id="play"><i class="fa fa-play"></i></div>
      <div class="right">
			<div class="icons-item right-icon">
				<div class="icon-right fa fa-comments-o"></div>
				<div class="icon-label right-label">44</div>
			</div>
			<div class="icons-item right-icon">
				<div class="icon-right fa fa-chart-simple"></div>
				<div class="icon-label right-label">44</div>
			</div>

		  </div>
    `;
    mediaContainer.appendChild(actions);

    const captions = document.createElement('div');
    captions.className = 'player-captions post-preview-video-actions';
    
    const caption = document.createElement('div');
    caption.className = 'player__caption';
    caption.textContent = post.content ? post.content.substring(0, 36) : '';
    captions.appendChild(caption);

    const captionAudio = document.createElement('div');
    captionAudio.className = 'player__caption__udio';
    captionAudio.innerHTML = '<i class="fa fa-music"></i> AJR • The best part';
    captions.appendChild(captionAudio);

    mediaContainer.appendChild(captions);

    const progress = document.createElement('div');
    progress.className = 'player-progress post-preview-video-actions';
    progress.innerHTML = `<input class="progress" id="progress" type="range" min="0" max="100" value="0">`;
    mediaContainer.appendChild(progress);

    const actionsBottom = document.createElement('div');
    actionsBottom.className = 'player-actions-bottom post-preview-video-actions';
    actionsBottom.innerHTML = `
      <div class="player-volume-button" onclick="document.querySelector('.post-preview-items-media').muted = true"><i class="fa fa-volume-mute"></i></div>
      <div class="player-fullscreen-button"><i class="fa fa-expand"></i></div>
      <div class="player-time-progress-left">00:00</div>
      <div class="player-time-progress-right">00:00</div>
    `;
    mediaContainer.appendChild(actionsBottom);

  } else {
    // THIS HAS TO BE TEXT SOMEHOW
    const img = document.createElement('img');
    img.className = 'post-preview-items-media';
    img.src = post.thumb_url || `${_server_cdn}/get/image/${bodyData.user_id}/test/1/thumb.jpg`;
    img.setAttribute('data-pid', post.post_id);
    // img.setAttribute('data-src', post.post_url || '');
    img.setAttribute('data-src', `${_server_cdn}/get/image/${bodyData.user_id}/image/1/postsample.jpg`);
    img.onload = function () { onImgLoad(this, this.getAttribute('data-src')); };
    img.onclick = function () { clickImageAIAction('compare', { pid: post.post_id }); };
    mediaContainer.appendChild(img);
  }

  // Post preview content caption
  if (post.post_type === "image") {
    const caption = document.createElement('div');
    caption.className = 'post-preview-content-caption';
    caption.innerHTML = `
    <span class="post-preview-content-caption-username">@${post.user ? post.user.username : 'Unknown'}</span>
    <div class="post-preview-caption-dot"><i class="focus_dot">•</i></div>
  `;
    mediaContainer.appendChild(caption);
  } else {
    const caption = document.createElement('div');
    caption.className = 'post-preview-content-caption';

    mediaContainer.appendChild(caption);
  }

  items.appendChild(mediaContainer);

  postCm.appendChild(items);

  // Post-preview-items-detail
  const detail = document.createElement('div');
  detail.className = 'post-preview-items-detail';
  detail.innerHTML = `
    <img class="post-preview-user-media-bottom" src="${_server_cdn}/get/image/${bodyData.user_id}/test/1/thumb.jpg" onload="onImgLoad(this, this.getAttribute('data-src'))" data-src="${_server_cdn}/get/image/${bodyData.user_id}/image/1/profilesample.jpg">
    <div onclick="iurl('vprofile', {uuid: '${post.user ? post.user.user_id : ''}' })" data-uuid="${post.user ? post.user.user_id : ''}" class="post-preview-items-username">
      ${post.user ? (post.user.first_name + ' ' + post.user.last_name) : '..'}
      ${post.user && post.user.is_verified ? '<i class="fa fa-check-circle"></i>' : ''}
    </div>
    <div class="post-preview-right-ics">
      <div class="follow-button-right" onclick="showCommentsContainer();"><i class="like-icon far fa-thumbs-o-up"></i></div>
      <div class="icn post-preview-right-ge onclick-blue">${post.likes ? post.likes.length : 0}</div>
    </div>
  `;
  postCm.appendChild(detail);

  // Content text container
  const textContainer = document.createElement('div');
  textContainer.className = 'post-preview-content-text-container';
  textContainer.innerHTML = `
    <div class="post-preview-p-text-bottom">${post.content ? post.content.substring(0, 70) : ''}</div>
    <span>${formatRelativeTime(post.created_at)}</span>
  `;
  if (post.post_type != "video") {
    postCm.appendChild(textContainer);
  }

  // Tags
  if (post.post_tags && post.post_tags.length > 0) {
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'post-tags-container';
    const tagsInner = document.createElement('div');
    tagsInner.className = 'tags-inner';
    post.post_tags.slice(0, 2).forEach(tag => {
      const tagDot = document.createElement('div');
      tagDot.className = 'tag-dot';
      tagDot.textContent = '•';
      tagsInner.appendChild(tagDot);

      const tagSpan = document.createElement('span');
      tagSpan.className = 'tag-inner-content';
      tagSpan.innerHTML = `<i><span class='tagged-user'>${tag.tag_content}</span></i>`;
      tagsInner.appendChild(tagSpan);
    });
    tagsContainer.appendChild(tagsInner);
    if (post.post_type != "video") {
      postCm.appendChild(tagsContainer);
    }

  }


  // Inline actions (similar, comments)
  const icsInline = document.createElement('div');
  icsInline.className = 'ics-home-inline mb-6';
  icsInline.innerHTML = `
    <div class="ai-search-cnt">
      <div class="ai-search-icr active"></div>
      <span>Similar</span>
    </div>
    <div class="ai-search-cnt">
      <div class="ai-search-icr"></div>
      <span>Comments</span>
    </div>
  `;
  if (post.post_type != "video") {
    postCm.appendChild(document.createElement('div')).className = 'mb-20';
    postCm.appendChild(icsInline);
  }

  // Related content loader
  const related = document.createElement('div');
  related.className = 'related-content suggestions mt-8';
  related.innerHTML = `
    <div class="cc2nt" id="c140">
      <div class="c230"><i class="loader_dot">•</i><i class="loader_dot">•</i><i class="loader_dot">•</i></div>
    </div>
  `;
  if (post.post_type != "video") {
    postCm.appendChild(related);
  }

  // Bottom post actions
  const bottomIcs = document.createElement('div');
  bottomIcs.className = 'bottom-pst-ics default-background';
  bottomIcs.innerHTML = `
    <img class="bottom-item-image" onload="onImgLoad(this, this.getAttribute('data-src'))" data-src="${_server_cdn}/get/image/${bodyData.user_id}/image/1/postsample.jpg" src="${_server_cdn}/get/image/${bodyData.user_id}/test/1/thumb.jpg">
    <input type="text" placeholder="Add a comment..." data-pid="${post.post_id}" class="comment-input">
    <div class="ics-bottom-items">
      <div class="ics-bottom-item-ge"><i class="comments-icon fa fa-comments-o"></i> ${post.comments ? post.comments : 0}</div>
      
      <div class="ics-bottom-item-ge" onclick="sharePost(this, this.getAttribute('data-pid'))" data-pid="${post.post_id}">
        <i class="share-icon fa fa-share"></i> ${post.shares ? post.shares : 0}
      </div>
      <div class="ics-bottom-item-ge"><i class="comments-icon fa fa-bookmark"></i> Save</div>
    </div>
  `;
  /*
  if (post.post_type != "video") {
    postCm.appendChild(bottomIcs);
  }
  */
  const commentsContainer = document.createElement('div');
  commentsContainer.className = 'comments-container';
  commentsContainer.innerHTML = `
			<div class="comments-head">
				<span class="comments-head-label">${post.comments} comments</span>
				<span class="comments-head-close">
					&#10005;
				</span>
			</div>
			<div class="comments-list">
			</div>
  `;

  if (post.post_type == "video") {
    postCm.appendChild(commentsContainer);

  }

  preview.appendChild(postCm);
  // Append the post preview to the fragment
  fragment.appendChild(preview);
  return fragment;
}

function addStoryBars(container, storyCount, color = '#1DA1F2', size = 55, thickness = 1) {
  // Remove any previous SVG
  const oldSvg = container.querySelector('.story-bars-svg');
  if (oldSvg) oldSvg.remove();

  // Create SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.classList.add('story-bars-svg');
  svg.style.position = 'absolute';
  svg.style.top = 0;
  svg.style.left = 0;
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = 2;

  const center = size / 2;
  const radius = center - thickness / 2;
  const anglePer = 360 / storyCount;
  const gap = Math.min(8, anglePer * 0.25); // gap between bars

  for (let i = 0; i < storyCount; i++) {
    const startAngle = (i * anglePer) + gap / 2;
    const endAngle = ((i + 1) * anglePer) - gap / 2;
    const start = polarToCartesian(center, center, radius, endAngle);
    const end = polarToCartesian(center, center, radius, startAngle);

    const arcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    const d = [
      "M", start.x, start.y,
      "A", radius, radius, 0, arcFlag, 0, end.x, end.y
    ].join(" ");

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', thickness);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    svg.appendChild(path);
  }

  container.style.position = 'relative';
  container.appendChild(svg);
}

// Helper to convert polar coordinates to cartesian
function polarToCartesian(cx, cy, r, angle) {
  const rad = (angle - 90) * Math.PI / 180.0;
  return {
    x: cx + (r * Math.cos(rad)),
    y: cy + (r * Math.sin(rad))
  };
}

function createSettingsElement() {
    const container = document.createElement('div');
    container.className = 'settings-container';

    // Settings container
    const settingsContainer = document.createElement('div');
    
    // Header
    const header = document.createElement('div');
    header.className = 'header';
    const backIcon = document.createElement('i');
    backIcon.className = 'fas fa-arrow-left icon';
    const helpIcon = document.createElement('i');
    helpIcon.className = 'fas fa-question icon right-icon';
    header.appendChild(backIcon);
    //header.appendChild(helpIcon);

    // Profile section
    const profileSection = document.createElement('div');
    profileSection.className = 'profile-section';
    const profileImageDiv = document.createElement('div');
    profileImageDiv.className = 'profile-image';
    const profileImg = document.createElement('img');
    profileImg.src = 'https://i.ibb.co/S6w8yvM/profile-image.jpg';
    profileImg.alt = 'Profile Image';
    profileImageDiv.appendChild(profileImg);
    const settingsTitle = document.createElement('h2');
    settingsTitle.textContent = JSON.parse(getItem('user_data')).first_name + ' ' + JSON.parse(getItem('user_data')).last_name;
    //settingsTitle.textContent = JSInterface.getUserFirstName() + ' ' + JSInterface.getUserLastName();
    profileSection.appendChild(profileImageDiv);
    profileSection.appendChild(settingsTitle);

    // Assemble settings container
    settingsContainer.appendChild(header);
    settingsContainer.appendChild(profileSection);

    // Menu items with click handlers
    const menuItems = [
        { icon: 'fa-user', text: 'Account', section: 'account' },
        { icon: 'fa-lock', text: 'Security', section: 'security' },
        { icon: 'fa-eye', text: 'Preferences', section: 'preferences' },
        { icon: 'fa-eye', text: 'Visibility', section: 'visibility' },
        { icon: 'fa-shield-alt', text: 'Data privacy', section: 'privacy' },
        { icon: 'fa-list-alt', text: 'Professional', section: 'professional' },
        { icon: 'fa-bell', text: 'Notifications', section: 'notifications' },
        { icon: 'fa-question', text: 'Help Center', section: 'help' }
    ];

    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        const itemIcon = document.createElement('i');
        itemIcon.className = `fas ${item.icon} item-icon`;
        const itemText = document.createElement('span');
        itemText.className = 'item-text';
        itemText.textContent = item.text;
        menuItem.appendChild(itemIcon);
        menuItem.appendChild(itemText);

        // Add click handler to run custom load function
        menuItem.onclick = () => loadSettingsSection(item.section);

        settingsContainer.appendChild(menuItem);
    });

    // Footer items
    const footerItems = [
        'Help Center',
        'Privacy & Terms',
        'Ad Choices',
        'Advertising',
        'Business Services',
        "Oxean SA's App Gallery"
    ];
    

    // Footer copyright
    const copyright = document.createElement('div');
    copyright.className = 'footer-text';
    copyright.style.marginTop = '20px';
    copyright.style.fontWeight = 'bold';
    copyright.innerHTML = 'Lona &copy; 2025';

    // Final assembly
    container.appendChild(settingsContainer);
    footerItems.forEach(text => {
        const footerText = document.createElement('div');
        footerText.className = 'footer-text';
        footerText.textContent = text;
        //container.appendChild(footerText);
    });
    container.appendChild(copyright);

    return container;
}

function loadSettingsSection(sectionName) {
    // Map section names to functions
    const sectionFunctions = {
        account: () => {
            const overlay = document.querySelector('.overlay-page');
            if (overlay) {
                overlay.innerHTML = '';
                overlay.appendChild(createAccountSettingsElement());
                overlay.style.display = 'block';
            }
        },
        security: () => {
            // Implement security section logic here
            console.log("Load Security Section");
        },
        preferences: () => {
            // Implement preferences section logic here
            console.log("Load Preferences Section");
        },
        visibility: () => {
            // Implement visibility section logic here
            console.log("Load Visibility Section");
        },
        privacy: () => {
            // Implement privacy section logic here
            console.log("Load Data Privacy Section");
        },
        professional: () => {
            // Implement professional mode section logic here
            console.log("Load Professional Mode Section");
        },
        notifications: () => {
            // Implement notifications section logic here
            console.log("Load Notifications Section");
        },
        help: () => {
            // Implement help center section logic here
            console.log("Load Help Center Section");
        }
    };

    // Execute the function if it exists
    if (sectionFunctions[sectionName]) {
        sectionFunctions[sectionName]();
    } else {
        console.log("No function defined for section:", sectionName);
    }
}

function createAccountSettingsElement() {
    const container = document.createElement('div');
    container.className = 'account-settings-container';

    // Header
    const header = document.createElement('div');
    header.className = 'header';
    const backIcon = document.createElement('i');
    backIcon.className = 'fas fa-arrow-left icon';
    const title = document.createElement('h1');
    title.textContent = 'Account';
    const helpIcon = document.createElement('i');
    helpIcon.className = 'fas fa-question-circle right-icon';
    header.appendChild(backIcon);
    header.appendChild(title);
    header.appendChild(helpIcon);
    container.appendChild(header);

    // Section: Profile information
    container.appendChild(createSectionTitle('Profile information'));
    container.appendChild(createMenuItem('Name, location, and industry'));
    container.appendChild(createMenuItem('Personal demographic information'));
    container.appendChild(createMenuItem('Verifications'));

    // Section: Display
    container.appendChild(createSectionTitle('Display'));
    container.appendChild(createMenuItem('Dark mode'));

    // Section: General preferences
    container.appendChild(createSectionTitle('General preferences'));
    container.appendChild(createMenuItem('Language'));
    container.appendChild(createMenuItem('Content language'));

    // Menu item: Showing profile photos
    container.appendChild(createComplexMenuItem('Showing profile photos', 'All followers'));

    // Menu item: Preferred Feed View
    container.appendChild(createComplexMenuItem('Preferred Feed View', 'Most relevant posts (Reco...'));

    // Menu item: Feed Layout
    container.appendChild(createComplexMenuItem('Feed Layout', 'Default'));

    // Menu item: People you unfollowed
    container.appendChild(createMenuItem('People you unfollowed'));

    // Footer items
    const footerItems = [
        'Sign out',
    ];
    footerItems.forEach(text => {
        const footerText = document.createElement('div');
        footerText.className = 'footer-text';
        footerText.textContent = text;
        container.appendChild(footerText);
    });

    return container;

    // Helper functions
    function createSectionTitle(title) {
        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'section-title';
        sectionTitle.textContent = title;
        return sectionTitle;
    }

    function createMenuItem(text) {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        const itemText = document.createElement('span');
        itemText.className = 'item-text main-text';
        itemText.textContent = text;
        const arrowIcon = document.createElement('i');
        arrowIcon.className = 'fas fa-arrow-right arrow-icon';
        menuItem.appendChild(itemText);
        menuItem.appendChild(arrowIcon);
        return menuItem;
    }

    function createComplexMenuItem(mainText, subText) {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';

        const itemTextDiv = document.createElement('div');
        itemTextDiv.className = 'item-text';
        const mainTextSpan = document.createElement('span');
        mainTextSpan.className = 'main-text';
        mainTextSpan.textContent = mainText;
        itemTextDiv.appendChild(mainTextSpan);

        const rightDiv = document.createElement('div');
        rightDiv.style.display = 'flex';
        rightDiv.style.alignItems = 'center';
        const subTextSpan = document.createElement('span');
        subTextSpan.className = 'sub-text';
        subTextSpan.textContent = subText;
        const arrowIcon = document.createElement('i');
        arrowIcon.className = 'fas fa-arrow-right arrow-icon';
        arrowIcon.style.marginLeft = '10px';
        rightDiv.appendChild(subTextSpan);
        rightDiv.appendChild(arrowIcon);

        menuItem.appendChild(itemTextDiv);
        menuItem.appendChild(rightDiv);
        return menuItem;
    }
}

function createStoryElement(story) {
  // stories: Array of story objects
  const fragment = document.createDocumentFragment();

  // Main inline container
  const stryCntInl = document.createElement('div');
  stryCntInl.className = 'stry-cnt-inl';

  // Story container
  const stryContainer = document.createElement('div');
  stryContainer.className = 'stry-container';

  // Gradient background
  const gradientBg = document.createElement('div');
  gradientBg.className = 'gradient-bg';
  addStoryBars(gradientBg, 0, '#1C1D20');

  // Media container
  const uMediaCnt = document.createElement('div');
  uMediaCnt.className = 'u-media-cnt';

  // Media (video or image)
  if (story.story_type === "video") {
    const canvas = document.createElement('canvas');
    canvas.className = 'story-u-media';
    renderVideoOnCanvasLazy(canvas, `${_server_cdn}/get/video/${bodyData.user_id}/video/1/postsample.mp4`, { autoplay: false, loop: false, muted: true });
    canvas.setAttribute('onclick', 'iurl("storyview", {sid: this.getAttribute("data-story-id") })');
    canvas.setAttribute('data-story-id', story.story_id);
    uMediaCnt.appendChild(canvas);
  } else {
    const canvas = document.createElement('canvas');
    canvas.className = 'story-u-media';
    renderImageOnCanvasLazy(canvas, `${_server_cdn}/get/image/${bodyData.user_id}/test/1/storysample.jpg`);
    canvas.setAttribute('onclick', 'iurl("storyview", {sid: this.getAttribute("data-story-id") })');
    canvas.setAttribute('data-story-id', story.story_id);
    uMediaCnt.appendChild(canvas);
  }

  gradientBg.appendChild(uMediaCnt);
  stryContainer.appendChild(gradientBg);

  // Username (trimmed, dots for spaces, no @)
  let uname = (story.user.username || '').replace(' ', '.').replace('@', '');
  if (uname.length > 7) uname = uname.slice(0, 7);

  const stryUname = document.createElement('div');
  stryUname.className = 'stry-uname';
  stryUname.textContent = uname;

  stryContainer.appendChild(stryUname);
  stryCntInl.appendChild(stryContainer);

  fragment.appendChild(stryCntInl);

  return fragment;
}

function createStoryViewElement(story) {
  // Create a fragment to hold the story view elements
  const fragment = document.createDocumentFragment();
  // Check if story is valid
  if (!story || !story.story_id) {
    console.error('Invalid story data:', story);
    return fragment; // Return empty fragment if story is invalid
  }
  // Main overlay container
  const overlay = document.createElement('div');
  overlay.className = 'storyview-overlay';
  overlay.setAttribute('data-story-id', story.story_id);

  // --- Progress Bar ---
  const progressBar = document.createElement('div');
  progressBar.className = 'storyview-progress-bar';
  const progressFill = document.createElement('div');
  progressFill.className = 'storyview-progress-fill';
  progressBar.appendChild(progressFill);
  overlay.appendChild(progressBar);

  // --- Header ---
  const header = document.createElement('div');
  header.className = 'storyview-header';

  // Header Left: Profile, Username, Time
  const headerLeft = document.createElement('div');
  headerLeft.className = 'storyview-header-left';

  const profileImg = document.createElement('img');
  profileImg.className = 'storyview-profile-img';
  if (!story.user || story.user.profile === 'df') {
    profileImg.src = 'assets/default.jpg';
  } else {
    profileImg.src = `${_server_cdn}/get/image/${bodyData.user_id}/image/1/postsample.jpg`;
  }
  profileImg.alt = 'Profile';

  const userInfo = document.createElement('div');
  userInfo.className = 'storyview-user-info';

  const usernameDiv = document.createElement('div');
  usernameDiv.className = 'storyview-username';
  usernameDiv.textContent = (story.user ? (story.user.first_name || 'Testing') + ' ' + (story.user.last_name || 'Name') : 'Unknown');

  const userhandleDiv = document.createElement('div');
  userhandleDiv.className = 'storyview-userhandle';
  userhandleDiv.textContent = '@' + (story.user ? story.user.username : 'unknown');

  userInfo.appendChild(usernameDiv);
  userInfo.appendChild(userhandleDiv);

  const timeSpan = document.createElement('span');
  timeSpan.className = 'storyview-time';
  timeSpan.textContent = formatRelativeTime(story.created_at) || 'now';

  headerLeft.appendChild(profileImg);
  headerLeft.appendChild(userInfo);
  headerLeft.appendChild(timeSpan);

  // Header Right: Close Button
  const headerRight = document.createElement('div');
  headerRight.className = 'storyview-header-right';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'storyview-close-btn';
  closeBtn.title = 'Close Story';
  closeBtn.innerHTML = '<i class="fa fa-times"></i>';
  headerRight.appendChild(closeBtn);

  header.appendChild(headerLeft);
  header.appendChild(headerRight);
  overlay.appendChild(header);

  // --- Media Container ---
  const mediaContainer = document.createElement('div');
  mediaContainer.className = 'storyview-media-container';

  if (story.story_type === 'image') {
    const img = document.createElement('img');
    img.className = 'storyview-media';
    img.src = `${_server_cdn}/get/image/${bodyData.user_id}/test/1/thumb.jpg`;
    img.setAttribute('data-src', `${_server_cdn}/get/image/${bodyData.user_id}/test/1/storysample.jpg`);
    img.onload = function () { onImgLoad(this, this.getAttribute('data-src')); };
    img.alt = 'Story Image';
    mediaContainer.appendChild(img);
  } else if (story.story_type === 'video') {
    const video = document.createElement('video');
    video.className = 'storyview-media';
    video.controls = false;
    video.autoplay = true;
    video.muted = true;
    video.setAttribute('data-src', `${_server_cdn}/get/video/${bodyData.user_id}/video/1/postsample.mp4`);
    video.setAttribute('data-story-id', story.story_id);
    video.onload = function () { onVidLoad(this, this.getAttribute('data-src'), true); };
    mediaContainer.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.className = 'storyview-media';
    img.src = `${_server_cdn}/get/image/${bodyData.user_id}/test/1/thumb.jpg`;
    img.setAttribute('data-src', `${_server_cdn}/get/image/${bodyData.user_id}/test/1/storysample.jpg`);
    img.onload = function () { onImgLoad(this, this.getAttribute('data-src')); };
    img.alt = 'Story Image';
    mediaContainer.appendChild(img);
  }

  // --- Caption ---
  if (story.caption) {
    const captionDiv = document.createElement('div');
    captionDiv.className = 'storyview-caption';
    captionDiv.textContent = story.caption;
    mediaContainer.appendChild(captionDiv);
  }

  overlay.appendChild(mediaContainer);

  // --- Comment Bar ---
  const commentBar = document.createElement('div');
  commentBar.className = 'storyview-comment-bar';

  const commentProfile = document.createElement('img');
  commentProfile.className = 'storyview-comment-profile';
  commentProfile.src = (!story.user || story.user.profile === 'df')
    ? `${_server_cdn}/get/image/${bodyData.user_id}/test/1/thumb.jpg`
    : `${_server_cdn}/get/image/${bodyData.user_id}/image/1/postsample.jpg`;
  commentProfile.alt = 'Profile';

  const commentInput = document.createElement('input');
  commentInput.type = 'text';
  commentInput.className = 'storyview-comment-input';
  commentInput.placeholder = 'Add a comment...';
  commentInput.setAttribute('data-pid', story.story_id);

  const sendBtn = document.createElement('button');
  sendBtn.className = 'storyview-send-btn';
  sendBtn.innerHTML = `<i class="fa fa-thumbs-o-up"></i>`;

  commentBar.appendChild(commentProfile);
  commentBar.appendChild(commentInput);
  commentBar.appendChild(sendBtn);

  overlay.appendChild(commentBar);

  // --- Navigation ---
  const nav = document.createElement('div');
  nav.className = 'storyview-nav';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'storyview-nav-btn';
  prevBtn.title = 'Previous Story';
  prevBtn.innerHTML = `<i class="fa fa-chevron-left"></i>`;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'storyview-nav-btn';
  nextBtn.title = 'Next Story';
  nextBtn.innerHTML = `<i class="fa fa-chevron-right"></i>`;

  nav.appendChild(prevBtn);
  nav.appendChild(nextBtn);

  overlay.appendChild(nav);

  // Append the overlay to the fragment
  fragment.appendChild(overlay);

  return fragment;
}

function renderRelatedPostsElements(data) {
  // Create a container for related posts
  // data: Array of arrays, each containing post objects
  if (!Array.isArray(data) || data.length < 2 || !Array.isArray(data[0]) || !Array.isArray(data[1])) {
    console.error('Invalid data format for related posts:', data);
    return null; // Return null if data is invalid
  }

  // Expected format:
  // data: [ [col1_posts...], [col2_posts...] ]
  // Create fragment to hold the related posts elements
  const fragment = document.createDocumentFragment();
  const container = document.createElement('div');
  container.className = 'post-preview-related-content';

  // Helper to create a column
  function createColumn(posts) {
    const col = document.createElement('div');
    col.className = 'column';
    posts.forEach(post => {
      const contentContainer = document.createElement('div');
      contentContainer.className = 'column-content-container';

      if (post['post_type'] === 'image') {
        const canvas = document.createElement('canvas');
        canvas.className = 'column-image';
        canvas.width = 320;
        canvas.height = 180;
        renderImageOnCanvasLazy(canvas, `${_server_cdn}/get/image/${bodyData.user_id}/image/1/postsample.jpg`);
        canvas.onclick = function () { iurl('postview', { pid: this.getAttribute('data-post-id') }); };
        contentContainer.appendChild(canvas);
      } else {
        const video = document.createElement('video');
        video.className = 'column-image';
        video.setAttribute('poster', `${_server_cdn}/get/image/${bodyData.user_id}/test/1/thumb.jpg`);
        video.setAttribute('onclick', "iurl('viewpost', {pid: this.getAttribute('data-post-id') })");
        video.setAttribute('data-post-id', post['post_id']);
        video.setAttribute('data-src', `${_server_cdn}/get/video/${bodyData.user_id}/video/1/postsample.mp4`);
        contentContainer.appendChild(video);

        const muteBtn = document.createElement('div');
        muteBtn.className = 'content-mute-button fa fa-volume-mute';
        muteBtn.setAttribute('onclick', 'toggleMute(this, false)');
        contentContainer.appendChild(muteBtn);
      }

      // Caption
      const caption = document.createElement('div');
      caption.className = 'content-caption';

      const captionImg = document.createElement('img');
      captionImg.className = 'content-caption-image';
      captionImg.setAttribute('src', `${_server_cdn}/get/image/${bodyData.user_id}/image/1/postsample.jpg`);
      caption.appendChild(captionImg);

      const username = document.createElement('span');
      username.className = 'content-caption-username';
      username.textContent = post['user'] && post['user']['username'] ? post['user']['username'] : '';
      caption.appendChild(username);

      const likesDiv = document.createElement('div');
      likesDiv.className = 'content-caption-likes';

      const likesIcon = document.createElement('i');
      likesIcon.className = 'content-caption-likes-icon far fa-thumbs-o-up';
      likesDiv.appendChild(likesIcon);

      const likesCount = document.createElement('span');
      likesCount.className = 'content-caption-likes-count';
      likesCount.textContent = '1k';
      likesDiv.appendChild(likesCount);

      caption.appendChild(likesDiv);
      contentContainer.appendChild(caption);

      col.appendChild(contentContainer);
    });
    return col;
  }

  // Defensive: fallback to empty arrays if not present
  container.appendChild(createColumn(Array.isArray(data[0]) ? data[0] : []));

  // Append the container to the fragment
  fragment.appendChild(container);

  return fragment;
}

function createChatViewElement(chatData) {
  // chatData: Object containing chat details
  if (!chatData || !chatData.chat_id) {
    console.error('Invalid chat data:', chatData);
    return null; // Return null if chat data is invalid
  }
  // Create a fragment to hold the chat view elements
  const fragment = document.createDocumentFragment();
  const username = (chatData.first_name || '') + ' ' + (chatData.last_name || '');

  // Main chatview container
  const chatview = document.createElement('div');
  chatview.className = 'chatview';

  // --- Chat Header Bar ---
  const bar = document.createElement('div');
  bar.className = 'bar';

  // Left/back button
  const backBtn = document.createElement('div');
  backBtn.className = 'bar-btn-gl onclick-blue';
  backBtn.onclick = function () { BackTo('messages', 'useCache'); };
  backBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="38" viewBox="0 -960 960 960" width="29">
    <path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z"/>
  </svg>`;

  // User detail: avatar + username/last-seen
  const userDetail = document.createElement('div');
  userDetail.className = 'chat-user-detail';

  // Avatar
  const userAvatarCanvas = document.createElement('canvas');
  userAvatarCanvas.className = 'cu-media';
  renderImageOnCanvasLazy(userAvatarCanvas, `${_server_cdn}/get/image/${bodyData.user_id}/image/1/profilesample.jpg`);
  userAvatarCanvas.onclick = function () { iurl('profileview', { pid: this.getAttribute('data-post-id') }); };
  // Username and last-seen stacked
  const userMeta = document.createElement('div');
  userMeta.className = 'user-meta';

  const usernameDiv = document.createElement('div');
  usernameDiv.className = 'chat-username';
  usernameDiv.innerHTML = username;
  usernameDiv.setAttribute('onclick', "iurl('vprofile', {uuid: this.getAttribute('data-uuid') })");
  usernameDiv.setAttribute('data-uuid', chatData.chat_id);
  if (chatData.is_verified) {
    usernameDiv.innerHTML += ' <i class="fa fa-check-circle"></i>';
  }

  const lastSeen = document.createElement('div');
  lastSeen.className = 'last-seen';
  lastSeen.textContent = chatData.last_seen || 'Online';

  userMeta.appendChild(usernameDiv);
  userMeta.appendChild(lastSeen);

  userDetail.appendChild(userAvatarCanvas);
  userDetail.appendChild(userMeta);

  // Right buttons (call/video)
  const rightBtns = document.createElement('div');
  rightBtns.style.display = 'flex';
  rightBtns.style.alignItems = 'center';

  const camBtn = document.createElement('div');
  camBtn.className = 'bar-btn-gr';
  camBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-camera-video" viewBox="0 0 16 16">
    <path fill-rule="evenodd" d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2V5zm11.5 5.175 3.5 1.556V4.269l-3.5 1.556v4.35zM2 4a1 1 0 0 0-.5.5v6a1 1 0 0 0 .5.5h7.5a1 1 0 0 0 .5-.5V5a1 1 0 0 0-.5-.5H2z"/>
  </svg>`;

  const phoneBtn = document.createElement('div');
  phoneBtn.className = 'bar-btn-gr';
  phoneBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="currentColor" class="bi bi-telephone" viewBox="0 0 16 16">
    <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/>
  </svg>`;

  const moreOptions = document.createElement('div');
  moreOptions.className = 'bar-btn-gr';
  moreOptions.innerHTML = `<div class="fa fa-chevron-down"></div>`;


  moreOptions.onclick = function () {
    const optionsMenu = document.createElement('div');
    optionsMenu.className = 'options-menu';
    optionsMenu.innerHTML = `
      <div class="option-item" onclick="iurl('vprofile', {uuid: '${chatData.chat_id}' })">View Profile</div>
      <div class="option-item" onclick="reportUser('${chatData.chat_id}')">Report User</div>
      <div class="option-item" onclick="blockUser('${chatData.chat_id}')">Block User</div>
    `;
    this.appendChild(optionsMenu);
  }

  rightBtns.appendChild(moreOptions);

  // Compose bar: left, center, right

  bar.appendChild(userDetail);
  bar.appendChild(rightBtns);

  chatview.appendChild(bar);

  /* --- Timeline (optional, can be removed if not needed) ---*/
  const timelineContainer = document.createElement('div');
  timelineContainer.className = 'bio-container';
  const bioDiv = document.createElement('div');
  bioDiv.className = 'bio';
  bioDiv.textContent = chatData.bio;
  timelineContainer.appendChild(bioDiv);
  //chatview.appendChild(timelineContainer);


  const innermMessagesContainer = document.createElement('div');
  innermMessagesContainer.className = 'inner-messages-container';

  // --- Chat user info ---
  const chatUserInfo = document.createElement('div');
  chatUserInfo.className = 'chat-user-info';
  chatUserInfo.innerHTML = `
    <img class="chat-user-avatar" src="${chatData.profile === 'df' || !chatData.profile ? '../img/default1.jpg' : `${_server_cdn}/get/image/${bodyData.user_id}/image/1/profilesample.jpg`}"
    data-uuid="${chatData.chat_id}" onclick="iurl('vprofile', {uuid: this.getAttribute('data-uuid') })">
  <div class="chat-user-name" onclick="iurl('vprofile', {uuid: '${chatData.chat_id}' })">
    ${username} ${chatData.is_verified ? '<i class="fa fa-check-circle"></i>' : ''}
  </div>
  <div class="chat-user-last-seen">Profile</div>
  
  
  `;
  innermMessagesContainer.appendChild(chatUserInfo);

  // --- Messages ---
  const messages = document.createElement('div');
  messages.className = 'messages';
  messages.id = 'chat-messages';

  innermMessagesContainer.appendChild(messages);
  chatview.appendChild(innermMessagesContainer);

  // --- Input Bar ---
  const inputDiv = document.createElement('div');
  inputDiv.className = 'input';


  const msgInputContainer = document.createElement('div');
  msgInputContainer.className = 'message-input-container';
  const msgInput = document.createElement('input');
  msgInput.className = 'message-input';
  msgInput.type = 'text';
  msgInput.placeholder = 'Type a message';
  msgInputContainer.appendChild(msgInput);
  inputDiv.appendChild(msgInputContainer);

  const inputCamera = document.createElement('div');
  inputCamera.className = 'input-camera fa fa-face-smile';
  inputDiv.appendChild(inputCamera);

  const sendBtn = document.createElement('div');
  sendBtn.className = 'input-send-button fa fa-paper-plane';
  sendBtn.setAttribute('data-uuid', chatData.chat_id);
  inputDiv.appendChild(sendBtn);

  sendBtn.onclick = function () {
    const text = msgInput.value.trim();
    if (!text) return;

    bodyData.chat_id = chatData.chat_id;
    bodyData.content = text;

    const time = new Date().toISOString();
    const messagesContainer = document.querySelector('.messages');
    const newMsg = {
      sender_id: getItem('user_id'),
      content: text,
      created_at: time
    };

    if (messagesContainer) {
      messagesContainer.appendChild(addMessageToChat(newMsg, true));
    }

    msgInput.value = '';
    //JSInterface.sendChatMessage(chatData.chat_id, chatData.public_key, text);
    // TODO Implement a sendChatMessage for web users
  };

  // Optional: send on Enter key
  //msgInput.addEventListener('keydown', function (e) {
    //if (e.key === "Enter") sendBtn.onclick();
  //});

  chatview.appendChild(inputDiv);
  // Append the chatview to the fragment
  fragment.appendChild(chatview);

  return fragment;
}

function videoPostsFilter(state) {
  var currentPage = getItem("currentLayout");
  cachedPosts = window.sessionStorage.getItem("home_video_posts");
  bodyData.page = "videoposts";

  if (currentPage) {
    if (state == "useCache" && cachedPosts) {
      // the posts were cached
      // get posts from cache and set them to local state
      $("#posts").innerHTML = cachedPosts;
      $("#c140").style.display = "none";
    } else {
      // the posts are not cached, so execute an api request to fetch them
      // then get first batch of posts from DB to display them in home page

      n = fetchData("/page/f", "POST", bodyData, "no-cache");
      n.then(response => response.text())
        .then(data => {
          $("#posts").innerHTML = data;
          $("#c140").style.display = "none";
          window.sessionStorage.setItem("home_video_posts", data);
        });
    };
  };
};

function marketPosts(state) {
  var currentPage = getItem("currentLayout");
  cachedPosts = window.sessionStorage.getItem("home_market_posts");
  bodyData.page = "marketposts";

  if (currentPage) {
    if (state == "useCache" && cachedPosts) {
      // the posts were cached
      // get posts from cache and set them to local state
      $("#posts").innerHTML = cachedPosts;
      $("#c140").style.display = "none";
    } else {
      // the posts are not cached, so execute an api request to fetch them
      // then get first batch of posts from DB to display them in home page

      n = fetchData("/page/f", "POST", bodyData, "no-cache");
      n.then(response => response.text())
        .then(data => {
          $("#posts").innerHTML = data;
          $("#c140").style.display = "none";
          window.sessionStorage.setItem("home_market_posts", data);
        });
    };
  };
};

function stories(state) {
  var currentPage = getItem("currentLayout");
  bodyData.np = 12; // Number of posts to fetch

  if (currentPage) {
    cachedStories = window.sessionStorage.getItem("stories");

    if (state == "useCache" && cachedStories) {
      // the posts were cached
      // get posts from cache and set them to local state
      try {
        cachedStories = JSON.parse(cachedStories);
      } catch (e) {
        cachedStories = [];
      }
      const storiesContainer = document.querySelector('.stories-inner');
      storiesContainer.innerHTML = '';
      cachedStories.forEach(story => {
        if (story.story_type == "video") return;
        storiesContainer.appendChild(createStoryElement(story));
      });
    } else {
      n = fetchData("/query/fys", "POST", bodyData, "no-cache");
      n.then(response => response.json())
        .then(data => {
          const storiesContainer = document.querySelector('.stories-inner');
          storiesContainer.innerHTML = '';
          data.forEach(story => {
            if (story.story_type == "video") return;
            storiesContainer.appendChild(createStoryElement(story));
            window.sessionStorage.setItem(`storydata${story.story_id}`, JSON.stringify(story));
          });
          window.sessionStorage.setItem("stories", JSON.stringify(data));

        });
    };
  };
};

function loadforyoufriends(state) {
  var currentPage = getItem("currentLayout");
  cachedData = window.sessionStorage.getItem("foyoufriends");
  bodyData.page = "foryoufriends";

  if (currentPage) {
    if (state == "useCache" && cachedData) {
      // the posts were cached
      // get posts from cache and set them to local state
      $(".friends-inner-content").innerHTML = cachedData;
      $("#c140").style.display = "none";
    } else {
      // the users are not cached, so execute an api request to fetch them
      // then get first batch of posts from DB to display them in friends page
      n = fetchData("/page/f", "POST", bodyData, "no-cache");
      n.then(response => response.text())
        .then(data => {
          $(".friends-inner-content").innerHTML = data;
          window.sessionStorage.setItem("foryoufriends", data);
        });
    };
  };
};

function active_users(state) {
  var currentPage = getItem("currentLayout");
  cachedData = window.sessionStorage.getItem("active-users");
  bodyData.page = "active_users";

  if (currentPage == "messages") {
    if (cachedData) {
      // the posts were cached
      // get posts from cache and set them to local state
      $("#actv").innerHTML = cachedData;
      $("#c140").style.display = "none";
    } else {
      n = fetchData("/page/f", "POST", bodyData, "no-cache");
      n.then(response => response.text())
        .then(data => {
          $("#actv").innerHTML = data;
          $('#c140').style.display = 'none';
          window.sessionStorage.setItem("active-users", data);
        });
    };
  };
};


// Send a message
function addMessageToChat(msg, scroll) {
  // Create message container
  var message = document.createElement('div');
  message.className = 'message ' + (msg.sender_id == bodyData.user_id ? 'sent' : 'receive');

  // Format content and time
  const formattedContent = addLineBreaks(msg.content || msg.message || '', 20);
  const timestamp = msg.created_at || msg.timestamp || '';

  // Build message HTML
  var messageContent = `
    <div class="message-in">
      <span class="content">${formattedContent}</span>
    </div>
  `;
  message.innerHTML = messageContent;

  // Append to messages container
  const messagesContainer = document.querySelector('.messages');
  if (messagesContainer) {
    messagesContainer.appendChild(message);
    if (scroll) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }
}

function fetchMessages(user2_id, refresh = false) {
  bodyData.chat_id = user2_id;

  cachedMessages = getItem(`chat_messages${user2_id}`);

  if (cachedMessages) {
    try {
      cachedMessages = JSON.parse(cachedMessages);
      cachedMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } catch (e) {
      cachedMessages = [];
    }
    // ... render messages ...
    const messagesContainer = document.querySelector('.messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
      cachedMessages.forEach(msg => addMessageToChat(msg, false));
    }

  } else {
    fetchData("/query/cms", "POST", bodyData, "no-cache")
      .then(response => response.json())
      .then(messages => {
        const messagesContainer = document.querySelector('.messages');
        if (!messages || !Array.isArray(messages)) {
          messages = [];
        } else {
          messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }
        if (!messagesContainer) return;
        if (messagesContainer) {
          messagesContainer.innerHTML = '';
          messages.forEach(msg => addMessageToChat(msg, false));
          setItem(`chat_messages${user2_id}`, JSON.stringify(messages));
        }
      });
  }
}

function loadChatList(state = "useCache") {
  bodyData.nc = 6;

  let cachedChats = getItem("user_chats");

  // Helper: compare chat lists by user_id, message, and created_at

  if (cachedChats && state === "useCache") {
    try {
      cachedChats = JSON.parse(cachedChats);
    } catch (e) {
      cachedChats = [];
    }

    const chatListContainer = document.querySelector('.chats-list');
    if (!chatListContainer) return;
    chatListContainer.innerHTML = '';
    cachedChats.forEach(chat => {
      chatListContainer.appendChild(createChatElement(chat));
      window.sessionStorage.setItem(`chatdata${chat.user_id}`, JSON.stringify(chat));
    });
    
    $("#c140").style.display = "none";

    // Always fetch latest chats in the background
    fetchData("/query/cts", "POST", bodyData, "no-cache")
      .then(response => response.json())
      .then(data => {
        const chatListContainer = document.querySelector('.chats-list');
        if (!chatListContainer) return;
        chatListContainer.innerHTML = '';
        data.forEach(chat => {
          chatListContainer.appendChild(createChatElement(chat));
          window.sessionStorage.setItem(`chatdata${chat.user_id}`, JSON.stringify(chat));
          if (!getItem(`chatkey${chat.user_id}`)) {
            setItem(`chatkey${chat.user_id}`, JSON.stringify(chat.public_key));
          };
        });
        setItem('user_chats', JSON.stringify(data));
        $("#c140").style.display = "none";
      });
  
  } else {
    fetchData("/query/cts", "POST", bodyData, "no-cache")
      .then(response => response.json())
      .then(data => {
        const chatListContainer = document.querySelector('.chats-list');
        if (!chatListContainer) return;
        chatListContainer.innerHTML = '';
        data.forEach(chat => {
          chatListContainer.appendChild(createChatElement(chat));
          window.sessionStorage.setItem(`chatdata${chat.user_id}`, JSON.stringify(chat));
          if (!getItem(`chatkey${chat.user_id}`)) {
            setItem(`chatkey${chat.user_id}`, JSON.stringify(chat.public_key));
          };
        });
        setItem('user_chats', JSON.stringify(data));
        $("#c140").style.display = "none";
      });
  }
}

function createChatElement(chat) {
  // Username
  const username = (chat.first_name || '') + ' ' + (chat.last_name || '');

  // Main chat container
  const msgUserContainer = document.createElement('div');
  msgUserContainer.className = 'chats-user-container';
  msgUserContainer.setAttribute('onclick', "iurl('chatview', {uuid: this.getAttribute('data-uuid') })");
  msgUserContainer.setAttribute('data-uuid', chat.user_id);

  // Avatar (always left, vertically centered)
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'avatar';
  let avatarImg = document.createElement('img');
  if (chat.profile === 'df' || chat.profile === false) {
    avatarImg.src = '../img/default1.jpg';
  } else {
    avatarImg.src = `${_server_cdn}/get/image/${bodyData.user_id}/test/1/thumb.jpg`;
    avatarImg.setAttribute('data-src', `${_server_cdn}/get/image/${bodyData.user_id}/image/1/profilesample.jpg`);
    avatarImg.setAttribute('data-uuid', chat.user_id);
    avatarImg.onload = function () { onImgLoad(this, this.getAttribute('data-src')); };
    avatarImg.onclick = function () { iurl('vprofile', { uuid: this.getAttribute('data-uuid') }); };
  }
  avatarDiv.appendChild(avatarImg);

  // Content: username and message (vertical, but inline with avatar)
  const msgContent = document.createElement('div');
  msgContent.className = 'chats-content';
  msgContent.style.display = 'flex';
  msgContent.style.flexDirection = 'column';
  msgContent.style.justifyContent = 'center';
  msgContent.style.minWidth = '0';

  const msgUsername = document.createElement('span');
  msgUsername.className = 'chats-username';
  msgUsername.setAttribute('onclick', "iurl('chatview', {uuid: this.getAttribute('data-uuid') })");
  msgUsername.setAttribute('data-uuid', chat.user_id);
  msgUsername.innerHTML = username + ((chat.is_verified) ? ' <i class="fa fa-check-circle"></i>' : '');

  const msgText = document.createElement('span');
  msgText.className = 'chats-text-message';

  // decrypt message
  //const decryptedMessage = JSInterface.decryptChatMessage(chat.public_key, chat.iv, chat.cyphertext);
  msgText.innerHTML = truncate(chat.message, 50) + (chat.delivered === false ? ' <i class="fa fa-clock"></i>' : ` ${formatRelativeTime(chat.created_at)}`);

  msgContent.appendChild(msgUsername);
  msgContent.appendChild(msgText);

  // Meta: timestamp and tick (vertical, rightmost)
  const metaDiv = document.createElement('div');
  metaDiv.className = 'chats-meta';

  const msgTimestamp = document.createElement('span');
  msgTimestamp.className = 'chats-timestamp';
  msgTimestamp.textContent = '•';

  const tick = document.createElement('span');
  tick.className = 'chats-tick';
  tick.innerHTML = '<i class="fa fa-clock"></i>';

  metaDiv.appendChild(msgTimestamp);

  // Layout: avatar | content | meta
  msgUserContainer.appendChild(avatarDiv);
  msgUserContainer.appendChild(msgContent);
  msgUserContainer.appendChild(metaDiv);

  return msgUserContainer;
}


// Helper: truncate text to length with ellipsis
function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.substr(0, n) + '...' : str;
}

function getUserPosts(_uid) {
  var layout = getItem("currentLayout");
  if (layout) {
    fetchData(endpoint, "POST", bodyData, "force-cache")
      .then(res => res.text())
      .then(data => {
        $(".user-timeline-posts").innerHTML = data;
        $("#c140").style.display = "none";
      });
  }
};

function getSimilar(_pid) {
  bodyData.page = "relatedposts";
  bodyData.view_id = _pid;

  const suggestions = document.querySelector(".suggestions");
  if (!suggestions) return;

  let cachedPage = window.sessionStorage.getItem(`similarposts${_pid}`);
  if (cachedPage) {
    try {
      cachedPage = JSON.parse(cachedPage);
      suggestions.innerHTML = ""; // Clear previous
      cleanupVideos(suggestions);
      suggestions.appendChild(renderRelatedPostsElements(cachedPage));
      $("#c140").style.display = "none";

    } catch (e) {
      // fallback to fetch if cache is broken
      window.sessionStorage.removeItem(`similarposts${_pid}`);
      getSimilar(_pid);
    }
  } else {
    fetchData("/query/rps", "POST", bodyData, "no-cache")
      .then(response => response.json())
      .then(data => {
        suggestions.innerHTML = ""; // Clear previous
        cleanupVideos(suggestions);
        suggestions.appendChild(renderRelatedPostsElements(data));
        $("#c140").style.display = "none";
        window.sessionStorage.setItem(`similarposts${_pid}`, JSON.stringify(data));

      });
  }
}

// Navigation and UI
function setNavigationActive(el) {
  $(".nav-button-home").classList.remove("active");
  $(".nav-button-friends").classList.remove("active");
  $(".nav-button-messages").classList.remove("active");
  $(".nav-button-explore").classList.remove("active");
  $(".nav-button-profile").classList.remove("active");
  el.classList.add("active");
};

function disableNavigation() {
  $("#plogo").style.display = "none";
  $("#notif-button").style.display = "none";
  $("#create-button").style.display = "none";
  $("#calls-button").style.display = "none";
  $("#nav").style.display = "none";
};

function drawNavigation() {
  $("#plogo").style.display = "block";
  $("#notif-button").style.display = "block";
  $("#create-button").style.display = "block";
  $("#calls-button").style.display = "block";
  $("#nav").style.display = "block";
  $(".top-nav").style.display = "flex";
};

function showMenu(menu, data) {
  var collapsed = $(".bottom-collapsed-content");
  var content = $(".bottom-collapsed-inner-content");
  cachedPage = window.sessionStorage.getItem(`menu${data['postid']}`);
  if (cachedPage) {
    if ($(".bottom-collapsed-content").style.display == "block") {
      collapsed.style.display = "none";
    } else {
      collapsed.style.display = "block";
      $(".bottom-collapsed-content .user-name").innerHTML = data['username'];
      document.body.style.overflowY = "hidden";
    }
  } else {
    if ($(".bottom-collapsed-content").style.display == "block") {
      collapsed.style.display = "none";
      document.body.style.overflowY = "auto";
    } else {
      collapsed.style.display = "block";
      $(".bottom-collapsed-content .user-name").innerHTML = data['username'];
      document.body.style.overflowY = "hidden";
    }
  };
}

function showLayoutOverlay(layout) {
  $("#c220").style.display = "none";
  bodyData.view = layout;
  const overlay = document.querySelector('.overlay-page');
  const page = document.createDocumentFragment();
  checkAndSetHistory(layout);

  // Helper: show overlay with content
  const showOverlay = (content) => {
    overlay.innerHTML = '';
    page.appendChild(content);
    overlay.appendChild(page);
    overlay.style.display = 'block';
    overlay.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  // Post View
  if (layout === "settings") {
    setItem("currentLayout", "settings");
    if (setHistory) {
      history.pushState({ layout: "settings", pgid: 100 }, "", "#settings");
    }
    showOverlay(createSettingsElement());
  }
}

function eurl(layout, el) {
  $("#c220").style.display = "none";
  cachedPage = window.sessionStorage.getItem(layout);
  bodyData.page = layout;

  const cont = $(".top-nav-collapsed-content");
  const content = $(".top-nav-collapsed-inner-content");
  const bottomcollapsed = $(".bottom-collapsed-content");

  if (cachedPage) {
    if ($(".top-nav-collapsed-content").style.display == "flex") {
      cont.style.display = "none";
      bottomcollapsed.style.display = "none";
      document.body.style.overflowY = "auto";
    } else {
      cont.style.display = "flex";
      content.innerHTML = cachedPage;
      scaleIn(cont);
      document.body.style.overflowY = "hidden";
      setItem("currentLayout", "notifications");
      if (setHistory) {
        history.pushState({ layout: layout, pgid: 12 }, "", "#${data['uuid']}");
      }
    }
  } else {
    if ($(".top-nav-collapsed-content").style.display == "flex") {
      cont.style.display = "none";
      bottomcollapsed.style.display = "none";
      document.body.style.overflowY = "auto";
    } else {
      cont.style.display = "flex";
      n = fetchData("/page/m", "POST", bodyData, "no-cache");
      n.then(response => response.text())
        .then(data => {
          content.innerHTML = data;
          scaleIn(cont);
          document.body.style.overflowY = "hidden";
          window.sessionStorage.setItem(layout, data);
          setItem("currentLayout", layout);
          if (setHistory) {
            history.pushState({ layout: layout, pgid: 12 }, "", "#${data['uuid']}");
          }
        });
    }
  };
};

function overlayView(layout, data) {
  $("#c220").style.display = "none";
  bodyData.page = layout;
  bodyData.view_id = data['view_id']

  if (layout == "createpost") {

    cachedPage = window.sessionStorage.getItem(`createpost`);
    if (cachedPage) {
      $(".overlay-page").style.display = "block";
      setItem("currentLayout", "createpost");
      if (setHistory) {
        history.pushState({ layout: "createpost", pgid: 7 }, "", "#createpost");
      }
      $(".overlay-page").innerHTML = cachedPage;
      $(".overlay-page").scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
      $("#c220").style.display = "none";
    } else {
      n = fetchData("/page/e", "POST", bodyData, "no-cache");
      n.then(response => response.text())
        .then(dataa => {
          $(".overlay-page").style.display = "block";
          setItem("currentLayout", "createpost");
          if (setHistory) {
            history.pushState({ layout: "createpost", pgid: 7 }, "", "#createpost");
          }
          $(".overlay-page").innerHTML = dataa;
          $(".overlay-page").scrollTo({
            top: 0,
            left: 0,
            behavior: 'instant',
          });
          window.sessionStorage.setItem('createpost', dataa);
          $("#c220").style.display = "none";
        });
    };
  };
}

let overlayRestoreState = null;

function savePostsState() {
  const posts = document.querySelector('.posts');
  if (!posts) return;
  // Save scroll position and video states
  const scrollY = window.scrollY;
  const videoStates = [];
  posts.querySelectorAll('video').forEach(video => {
    videoStates.push({
      selector: video.getAttribute('data-src') ? `video[data-src="${video.getAttribute('data-src')}"]` : `video[src="${video.src}"]`,
      currentTime: video.currentTime,
      paused: video.paused,
      src: video.getAttribute('data-src') || video.src
    });
    video.pause();
  });
  overlayRestoreState = { scrollY, videoStates };
}

function restorePostsState() {
  const posts = document.querySelector('.posts');
  if (!posts || !overlayRestoreState) return;
  // Restore scroll position
  window.scrollTo({ top: overlayRestoreState.scrollY, left: 0, behavior: 'instant' });
  // Reload and restore all videos in posts container
  overlayRestoreState.videoStates.forEach(state => {
    let video = posts.querySelector(state.selector);
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.removeAttribute('data-loaded');
      video.dataset.loaded = "false";
      video.currentTime = 0;
      onVidLoad(video, state.src, false);
      video.addEventListener('loadedmetadata', function restore() {
        video.currentTime = state.currentTime;
        // if (!state.paused) video.play();
        video.removeEventListener('loadedmetadata', restore);
      });
    }
  });
  overlayRestoreState = null;
}

function iurl(layout, data) {
  $("#c220").style.display = "none";
  bodyData.view = layout;
  const overlay = document.querySelector('.overlay-page');
  const page = document.createDocumentFragment();
  checkAndSetHistory(layout);

  // Helper: show overlay with content
  const showOverlay = (content) => {
    overlay.innerHTML = '';
    page.appendChild(content);
    overlay.appendChild(page);
    overlay.style.display = 'block';
    overlay.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    $("#c220").style.display = "none";
  };

  // Helper: fetch and cache data, then show overlay
  const fetchAndShow = (endpoint, cacheKey, buildFn, pushStateObj) => {
    fetchData(endpoint, "POST", bodyData, "no-cache")
      .then(res => res.json())
      .then(obj => {
        if (Array.isArray(obj)) obj = obj[0];
        setItem("currentLayout", layout);
        if (setHistory) {
          history.pushState(pushStateObj, "", `#${layout}`);
        }
        showOverlay(buildFn(obj));
        window.sessionStorage.setItem(cacheKey, JSON.stringify(obj));
      });
  };

  // Helper: show from cache if available
  const showFromCache = (cacheKey, buildFn, pushStateObj) => {
    let cached = window.sessionStorage.getItem(cacheKey);
    if (cached) {
      try { cached = JSON.parse(cached); } catch (e) { cached = null; }
      setItem("currentLayout", layout);
      if (setHistory) {
        history.pushState(pushStateObj, "", `#${layout}`);
      }
      showOverlay(buildFn(Array.isArray(cached) ? cached[0] : cached));
      return true;
    }
    return false;
  };

  // Post View
  if (layout === "postview") {
    savePostsState();
    bodyData.view_id = data['pid'];
    let found = false;
    // Try dynamic posts cache
    let cachedPosts = window.sessionStorage.getItem("home_posts_dynamic");
    if (cachedPosts) {
      try {
        cachedPosts = JSON.parse(cachedPosts);
        let post = cachedPosts.find(p => p.post_id == data['pid']);
        if (post) {
          setItem("currentLayout", "postview");
          if (setHistory) {
            history.pushState({ layout: "postview", pgid: 7, iid: data['pid'] }, "", "#postview");
          }
          showOverlay(createPostViewElement(post));
          const videos = $(".post-preview-items").querySelectorAll('video[data-src]');
          videos.forEach(video => {
            video.pause();
            video.removeAttribute('src');
            video.removeAttribute('data-loaded');
            video.dataset.loaded = "false";
            video.currentTime = 0;
            onVidLoad(video, video.getAttribute('data-src'), true);
          });
          getSimilar(data['pid']);
          window.sessionStorage.setItem(`postview${data['pid']}`, JSON.stringify(post));
          found = true;
          Logger.logEvent('view', {type: 'post', post_id: data['pid']});
        }
      } catch (e) { }
    }
    if (!found) {
      // Try single post cache
      if (showFromCache(`postdata${data['pid']}`, createPostViewElement, { layout: "postview", pgid: 7, iid: data['pid'] })) {
        const videos = $(".post-preview-items").querySelectorAll('video[data-src]');
        videos.forEach(video => {
          video.pause();
          video.removeAttribute('src');
          video.removeAttribute('data-loaded');
          video.dataset.loaded = "false";
          video.currentTime = 0;
          onVidLoad(video, video.getAttribute('data-src'), true);
        });
        getSimilar(data['pid']);
        Logger.logEvent('view', {type: 'post', post_id: data['pid']});
      } else {
        fetchAndShow("/query/view", `postdata${data['pid']}`, createPostViewElement, { layout: "postview", pgid: 7, iid: data['pid'] });
        getSimilar(data['pid']);
        Logger.logEvent('view', {type: 'post', post_id: data['pid']});
      }
    }
    return;
  }

  // Chat View
  if (layout === "chatview") {
    bodyData.chat_id = data['uuid'];
    let found = false;
    // Try dynamic posts cache
    let cachedChats = getItem("user_chats");
    if (cachedChats) {
      try {
        cachedChats = JSON.parse(cachedChats);
        chat = cachedChats.find(c => c.user_id === data['uuid']);
        if (chat) {
          setItem("currentLayout", "chatview");
          if (setHistory) {
            history.pushState({ layout: "chaatview", pgid: 15, iid: data['uuid'] }, "", "#chatview");
          }
          showOverlay(createChatViewElement(chat));
          fetchMessages(data['uuid'], false);
          window.sessionStorage.setItem(`chatdata${data['uuid']}`, JSON.stringify(chat));
          found = true;
          Logger.logEvent('view', {type: 'chat', chat_id: data['uuid']});
          return;
        } else {
          // Try single chat cache
          let cachedChat = window.sessionStorage.getItem(`chatdata${data['uuid']}`);
          if (cachedChat) {
            try {
              cachedChat = JSON.parse(cachedChat);
              setItem("currentLayout", "chatview");
              if (setHistory) {
                history.pushState({ layout: "chatview", pgid: 15, iid: data['uuid'] }, "", "#chatview");
              }
              showOverlay(createChatViewElement(cachedChat));
              fetchMessages(data['uuid'], false);
              found = true;
              Logger.logEvent('view', {type: 'chat', chat_id: data['uuid']});
              return;
            } catch (e) { 
              console.error("Error parsing cached chat:", e);
              cachedChat = null;
              // Fallback to fetch if cache is broken
              fetchAndShow("/query/cud", `chatdata${data['uuid']}`, createChatViewElement, { layout: "chatview", pgid: 15, iid: data['uuid'] });
              fetchMessages(data['uuid'], true);
              overlay.scrollTo({ top: document.body.scrollHeight, left: 0, behavior: 'instant' });
              found = true;
              return;
            }
          }
        }
      } catch (e) { 
        cachedChats = [];
        console.error("Error parsing cached chats:", e);
        // Fallback to fetch if cache is broken
        fetchAndShow("/query/cud", `chatdata${data['uuid']}`, createChatViewElement, { layout: "chatview", pgid: 15, iid: data['uuid'] });
        fetchMessages(data['uuid'], true);
        overlay.scrollTo({ top: document.body.scrollHeight, left: 0, behavior: 'instant' });
        found = true;
        return;
      }
    }
    if (!found) {
      if (showFromCache(`chatdata${data['uuid']}`, createChatViewElement, { layout: "chatview", pgid: 15, iid: data['uuid'] })) {
        fetchMessages(data['uuid'], true);
        overlay.scrollTo({ top: document.body.scrollHeight, left: 0, behavior: 'instant' });
        Logger.logEvent('view', {type: 'chat', chat_id: data['uuid']});
      } else {
        fetchAndShow("/query/cud", `chatdata${data['uuid']}`, createChatViewElement, { layout: "chatview", pgid: 15, iid: data['uuid'] });
        fetchMessages(data['uuid'], true);
        overlay.scrollTo({ top: document.body.scrollHeight, left: 0, behavior: 'instant' });
        Logger.logEvent('view', {type: 'chat', chat_id: data['uuid']});
      }
    }
    return;
  }

  // Profile View
  if (layout === "profileview") {
    bodyData.view_id = data['uuid'];
    if (showFromCache(`profileview${data['uuid']}`, html => {
      const div = document.createElement('div');
      div.innerHTML = html;
      return div;
    }, { layout: "profileview", pgid: 16, iid: data['uuid'] })) {
      overlay.scrollTo({ top: document.body.scrollHeight, left: 0, behavior: 'instant' });
    } else {
      fetchData("/page/i", "POST", bodyData, "no-cache")
        .then(res => res.text())
        .then(html => {
          setItem("currentLayout", "profileview");
          if (setHistory) {
            history.pushState({ layout: "profileview", pgid: 16, iid: data['uuid'] }, "", "#profileview");
          }
          const div = document.createElement('div');
          div.innerHTML = html;
          showOverlay(div);
          overlay.scrollTo({ top: document.body.scrollHeight, left: 0, behavior: 'instant' });
          window.sessionStorage.setItem(`profileview${data['uuid']}`, html);
        });
    }
    return;
  }

  // Story View
  if (layout === "storyview") {
    savePostsState();
    bodyData.view_id = data['sid'];
    let found = false;
    // Try dynamic posts cache
    let cachedStories = window.sessionStorage.getItem("stories");
    if (cachedStories) {
      try {
        cachedStories = JSON.parse(cachedStories);
        let story = cachedPosts.find(s => s.story_id == data['sid']);
        if (story) {
          setItem("currentLayout", "storyview");
          if (setHistory) {
            history.pushState({ layout: "storyview", pgid: 7, iid: data['sid'] }, "", "#storyview");
          }
          showOverlay(createStoryViewElement(story));
          StoryViewManager.init();
          window.sessionStorage.setItem(`storyview${data['sid']}`, JSON.stringify(story));
          found = true;
          Logger.logEvent('view', {type: 'story', chat_id: data['sid']});
        }
      } catch (e) { }
    }
    if (!found) {
      // Try single story cache
      if (showFromCache(`storydata${data['sid']}`, createStoryViewElement, { layout: "storyview", pgid: 7, iid: data['sid'] })) {
        StoryViewManager.init();
        // TODO: make StoryViewManager manage one story and get more stories from server not with init()
        Logger.logEvent('view', {type: 'story', chat_id: data['sid']});
      } else {
        fetchAndShow("/query/view", `storydata${data['sid']}`, createStoryViewElement, { layout: "storyview", pgid: 7, iid: data['sid'] });
        StoryViewManager.init();
        // TODO: make StoryViewManager manage one story and get more stories from server not with init()
        Logger.logEvent('view', {type: 'story', chat_id: data['sid']});
      }
    }
    return;
  }
}

function preloadPages() {
  // List of pages to preload (add or remove as needed)
  const pages = [
    { key: "friends-page", endpoint: "/page/m", body: { ...bodyData, page: "friends" } },
    { key: "messages-page", endpoint: "/page/m", body: { ...bodyData, page: "messages" } },
    { key: "explore-page", endpoint: "/page/m", body: { ...bodyData, page: "explore" } },
    { key: "profile-page", endpoint: "/page/m", body: { ...bodyData, page: "profile" } }
  ];

  pages.forEach(page => {
    // Only fetch if not already cached
    if (!window.sessionStorage.getItem(page.key)) {
      fetchData(page.endpoint, "POST", page.body, "no-cache")
        .then(response => response.text())
        .then(data => {
          window.sessionStorage.setItem(page.key, data);
        })
        .catch(e => {
          // Optionally log or ignore errors
          console.warn(`Failed to preload ${page.key}:`, e);
        });
    }
  });
}

function nurl(layout, el, state) {
  $("#c220").style.display = "none";
  bodyData.page = layout;
  checkAndSetHistory(layout);


  // Helper for scroll restore
  const restoreScroll = () => {
    // Use a unique cookie key per page
    const currentPage = getItem("currentLayout") || "";
    const scrollKey = `${cookieName}_${currentPage}_scroll`;
    let positionState = getCookie(scrollKey);

    // If not found, fallback to old key for backward compatibility
    if (!positionState) positionState = getCookie(cookieName);

    if (positionState) {
      try {
        // If stored as JSON string, parse it
        if (typeof positionState === "string" && positionState.startsWith("{")) {
          positionState = JSON.parse(positionState);
        }
        window.scrollTo({
          top: positionState.scrollY || 0,
          left: positionState.scrollX || 0,
          behavior: 'instant',
        });
      } catch (e) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  };


  // Helper for navigation activation and UI
  const navUI = (btn, show = {}) => {
    drawNavigation();
    setNavigationActive(btn);
    $("#plogo").style.display = show.plogo ?? "block";
    $("#notif-button").style.display = show.notif ?? "block";
    $("#create-button").style.display = show.create ?? "block";
    $("#calls-button").style.display = show.calls ?? "block";
    if (show.topnav === false) $('.top-nav').style.display = 'none';
  };

  // Helper for page loading
  const loadPage = (key, endpoint, cb, show = {}) => {
    let cachedPage = window.sessionStorage.getItem(key);
    const page = document.createDocumentFragment();
    const pageDiv = document.createElement('div');
    if (cachedPage) {
      setItem("currentLayout", layout);
      pageDiv.innerHTML = cachedPage;
      page.appendChild(pageDiv);
      $("#pg").innerHTML = "";
      document.getElementById('pg').appendChild(page);
      navUI(el, show);
      if (setHistory) {
        history.pushState({ layout, pgid: show.pgid }, "", `#${layout}`);
      }
      cb && cb("cache");
    } else {
      fetchData(endpoint, "POST", bodyData, "force-cache")
        .then(res => res.text())
        .then(data => {
          setItem("currentLayout", layout);
          pageDiv.innerHTML = data;
          page.appendChild(pageDiv);
          $("#pg").innerHTML = "";
          document.getElementById('pg').appendChild(page);
          window.sessionStorage.setItem(key, data);
          navUI(el, show);
          if (setHistory) {
            history.pushState({ layout, pgid: show.pgid }, "", `#${layout}`);
          }
          cb && cb("fresh");
        });
    }

  };

  // Home
  if (layout == "home") {
    currentPage = getItem("currentLayout");
    cachedPage = window.sessionStorage.getItem("home-page");
    if (cachedPage && currentPage == "home") {
      $("#c140").style.display = "block";
      if (state == "refresh") {
        stories("refresh");
        loadForYouPostsDynamic("refresh");
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      } else {
        stories("useCache");
        loadForYouPostsDynamic("useCache");
        restoreScroll();
      }
    } else if (cachedPage && currentPage != "home") {
      loadPage("home-page", "/page/m", (src) => {
        $("#calls-button").innerHTML = (`<i onclick="eurl('calls', this)" class="fa fa-phone onclick-blue"></i>`);
        stories("useCache");
        loadForYouPostsDynamic("useCache");
        restoreScroll();
      }, {
        pgid: 1,
        plogo: "block",
        notif: "block",
        create: "block",
        calls: "block"
      });

    } else {
      loadPage("home-page", "/page/m", (src) => {
        $("#calls-button").innerHTML = (`<i onclick="eurl('calls', this)" class="fa fa-phone onclick-blue"></i>`);
        if (state == "refresh") {
          cleanupVideos($(".posts"));
          stories("refresh");
          loadForYouPostsDynamic("refresh");
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          preloadPages();
        } else {
          stories("useCache");
          loadForYouPostsDynamic("useCache");
          restoreScroll();
        }
      }, {
        pgid: 1,
        plogo: "block",
        notif: "block",
        create: "block",
        calls: "block"
      });
      return;
    }
  }

  // Friends
  if (layout == "friends") {
    loadPage("friends-page", "/page/m", (src) => {
      if (state == "refresh") foryoufriends("refresh");
      else {
        foryoufriends("useCache");
        restoreScroll();
      }
    }, {
      pgid: 2,
      plogo: "none",
      notif: "block",
      create: "none",
      calls: "none"
    });
    return;
  }

  // Messages
  if (layout == "messages") {
    loadPage("messages-page", "/page/m", (src) => {
      if (state == "refresh") {
        active_users("refresh");
        loadChatList("useCache");
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      } else {
        active_users("useCache");
        loadChatList("useCache");
        restoreScroll();
      }
    }, {
      pgid: 3,
      plogo: "none",
      notif: "block",
      create: "none",
      calls: "none"
    });
    return;
  }

  // Explore
  if (layout == "explore") {
    currentPage = getItem("currentLayout");
    cachedPage = window.sessionStorage.getItem("explore-page");
    if (cachedPage && currentPage == "explore") {
      $("#c140").style.display = "block";
      if (state == "refresh") {
        loadForYouPostsDynamic("refresh");
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      } else {
        loadForYouPostsDynamic("useCache");
        restoreScroll();
      }

    } else {
      loadPage("explore-page", "/page/m", (src) => {
        if (state == "refresh") {
          cleanupVideos($(".posts"));
          loadForYouPostsDynamic("refresh");
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        } else {
          loadForYouPostsDynamic("useCache");
          restoreScroll();
        }
      }, {
        pgid: 4,
        plogo: "none",
        notif: "block",
        create: "block",
        calls: "none"
      });
    }
    return;
  }

  // Profile
  if (layout == "profile") {
    loadPage("profile-page", "/page/m", () => {
      // getUserPosts(getItem("user_id"));
    }, {
      pgid: 5,
      plogo: "none",
      notif: "none",
      create: "none",
      calls: "none",
      topnav: false
    });
    return;
  }
}
// Fade in
function fadeIn(element) {
  element.classList.add('fade-in');
  setTimeout(() => element.classList.add('show'), 10);
}

// Fade out
function fadeOut(element) {
  element.classList.remove('show');
  setTimeout(() => element.classList.remove('fade-in'), 100);
}

// Slide up
function slideUp(element) {
  element.classList.add('slide-up');
  setTimeout(() => element.classList.add('show'), 10);
}

// Scale in
function scaleIn(element) {
  element.classList.add('scale-in');
  setTimeout(() => element.classList.add('show'), 10);
}

function transitionToPage(newPageId) {
  const current = document.querySelector('.page.active');
  const next = document.getElementById(newPageId);

  if (current) {
    fadeOut(current);
    current.classList.remove('active');
  }
  fadeIn(next);
  next.classList.add('active');
}


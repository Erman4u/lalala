document.addEventListener('DOMContentLoaded', () => {
  
  /* ==========================================================================
     1. GUEST NAME INITIALIZATION (DYNAMIC URL)
     ========================================================================== */
  /* ==========================================================================
     1. GUEST NAME INITIALIZATION (DYNAMIC URL via SUPABASE)
     ========================================================================== */
  let guestId = null; // Save UUID
  let guestToken = null; // Save QR Token

  const getGuestData = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Support lama (?to=NAMA)
    const oldGuest = urlParams.get('to');
    const guestNameEl = document.getElementById('tamu-name');
    
    // Support baru (?tamu=TOKEN)
    const token = urlParams.get('tamu');
    
    const qrBtn = document.getElementById('qr-btn');
    const qrModalOverlay = document.getElementById('qrModalOverlay');
    const qrModalClose = document.getElementById('qrModalClose');
    
    const showQRLogic = (data) => {
      guestId = data.id;
      guestToken = data.qr_token;
      guestNameEl.textContent = data.name;

      // Isi nama di modal
      document.getElementById('qrModalName').textContent = data.name;

      // Generate QR di dalam modal (bukan di cover)
      new QRCode(document.getElementById('qrModalCanvas'), {
        text: data.qr_token,
        width: 160,
        height: 160,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });

      // Tampilkan floating QR button
      if (qrBtn) qrBtn.style.display = 'flex';

      // Klik QR button → buka modal
      qrBtn.addEventListener('click', () => {
        qrModalOverlay.classList.add('open');
      });

      // Tutup modal
      qrModalClose.addEventListener('click', () => {
        qrModalOverlay.classList.remove('open');
      });

      // Klik overlay gelap → tutup
      qrModalOverlay.addEventListener('click', (e) => {
        if (e.target === qrModalOverlay) {
          qrModalOverlay.classList.remove('open');
        }
      });
    };
    
    if (token) {
      try {
        const { data, error } = await supabase
          .from('guests')
          .select('*')
          .eq('qr_token', token)
          .single();
          
        if (!error && data) showQRLogic(data);
        else guestNameEl.textContent = "Tamu Terhormat";
      } catch (err) {
        guestNameEl.textContent = "Tamu Terhormat";
      }
    } else if (oldGuest && oldGuest.trim() !== "") {
      const decodedName = decodeURIComponent(oldGuest);
      guestNameEl.textContent = decodedName; // Set nama dulu biar cepat muncul di cover
      
      try {
        const { data, error } = await supabase
          .from('guests')
          .select('*')
          .ilike('name', decodedName)
          .limit(1);
          
        if (!error && data && data.length > 0) {
          showQRLogic(data[0]);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      guestNameEl.textContent = "Tamu Terhormat";
    }
  };
  getGuestData();

  /* ==========================================================================
     2. MUSIC PLAYER & COVER OVERLAY MECHANISM
     ========================================================================== */
  const btnBuka = document.getElementById('btn-buka');
  const coverOverlay = document.getElementById('cover-overlay');
  const mainContent = document.getElementById('main-content');
  const musicBtn = document.getElementById('music-btn');
  const bottomNav = document.getElementById('bottom-nav');
  const bgMusic = document.getElementById('bg-music');
  let isMusicPlaying = false;
  let petalInterval = null;

  // Open invitation handler
  btnBuka.addEventListener('click', () => {
    // 1. Slide up cover overlay
    coverOverlay.classList.add('unlocked');
    
    // 2. Make main content visible with fade-in effect
    mainContent.classList.add('visible');
    
    // 3. Show and play background music
    musicBtn.classList.add('visible');
    playMusic();

    // 4. Show Navbar
    bottomNav.classList.add('visible');

    // 4. Start romantic falling petals effect
    startFallingPetals();
    
    // 5. Scroll to top of main content (Home section) to ensure correct position
    window.scrollTo({ top: 0, behavior: 'instant' });
  });

  // Music toggle handler
  musicBtn.addEventListener('click', () => {
    if (isMusicPlaying) {
      pauseMusic();
    } else {
      playMusic();
    }
  });

  const playMusic = () => {
    bgMusic.play().then(() => {
      isMusicPlaying = true;
      musicBtn.classList.add('playing');
    }).catch(error => {
      console.log("Autoplay was blocked by browser. User interaction needed: ", error);
    });
  };

  const pauseMusic = () => {
    bgMusic.pause();
    isMusicPlaying = false;
    musicBtn.classList.remove('playing');
  };

  /* ==========================================================================
     3. COUNTDOWN TIMER SYSTEM (TARGET: JULY 07, 2026 14:00:00 WITA / UTC+8)
     ========================================================================== */
  // Set to 07 Juli 2026 14:00 WITA (06:00 UTC)
  const targetDate = new Date("July 7, 2026 14:00:00 GMT+0800").getTime();

  const updateCountdown = () => {
    const now = new Date().getTime();
    const timeRemaining = targetDate - now;

    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');

    if (timeRemaining <= 0) {
      clearInterval(countdownInterval);
      daysEl.textContent = "00";
      hoursEl.textContent = "00";
      minutesEl.textContent = "00";
      secondsEl.textContent = "00";
      return;
    }

    // Time calculations
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

    // Format numbers with leading zeros
    daysEl.textContent = String(days).padStart(2, '0');
    hoursEl.textContent = String(hours).padStart(2, '0');
    minutesEl.textContent = String(minutes).padStart(2, '0');
    secondsEl.textContent = String(seconds).padStart(2, '0');
  };

  // Initial call and run every second
  updateCountdown();
  const countdownInterval = setInterval(updateCountdown, 1000);

  /* ==========================================================================
     4. ADD TO CALENDAR INTEGRATION
     ========================================================================== */
  const btnCalendar = document.getElementById('btn-calendar');
  btnCalendar.addEventListener('click', () => {
    // Google Calendar template link
    const title = encodeURIComponent("Pernikahan Gerald & Mega");
    const dates = "20260707T060000Z/20260707T120000Z"; // 07 Jul 2026 14:00 WITA (06:00 UTC) to 20:00 WITA (12:00 UTC)
    const details = encodeURIComponent("Tanpa mengurangi rasa hormat. Kami mengundang Bapak/Ibu/Saudara/i serta Kerabat sekalian untuk menghadiri acara pernikahan kami:\n\nPemberkatan & Resepsi: 14:00 WITA - Selesai\n\nLokasi: Ambalat Beach, Villa 119.");
    const location = encodeURIComponent("Ambalat Beach, Villa 119");
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    
    window.open(googleCalendarUrl, '_blank');
  });

  /* ==========================================================================
     4.5 GIFT INFO REVEAL MECHANISM
     ========================================================================== */
  const revealButtons = document.querySelectorAll('.btn-reveal-gift');
  revealButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const infoBody = this.previousElementSibling;
      infoBody.classList.add('active');
      this.style.display = 'none';
    });
  });

  /* ==========================================================================
     5. TOAST ALERTS & CLIPBOARD UTILITIES
     ========================================================================== */
  const toast = document.getElementById('toast-notif');
  const toastMsg = document.getElementById('toast-message');

  const showToast = (message) => {
    toastMsg.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  };

  // Global Copy Helper
  window.copyText = function(text, successMsg) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg || "Berhasil disalin!");
    }).catch(err => {
      console.error("Failed to copy text: ", err);
      showToast("Gagal menyalin text.");
    });
  };

  /* ==========================================================================
     6. MODALS POPUP LOGIC
     ========================================================================== */
  const alamatModal = document.getElementById('alamat-modal');
  const btnAlamat = document.getElementById('btn-alamat');
  const alamatCloseBtn = document.getElementById('alamat-modal-close-btn');
  const alamatCloseBg = document.getElementById('alamat-modal-close-bg');

  // Alamat Modal Toggles
  if(btnAlamat) btnAlamat.addEventListener('click', () => alamatModal.classList.add('active'));
  if(alamatCloseBtn) alamatCloseBtn.addEventListener('click', () => alamatModal.classList.remove('active'));
  if(alamatCloseBg) alamatCloseBg.addEventListener('click', () => alamatModal.classList.remove('active'));

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
      if(alamatModal) alamatModal.classList.remove('active');
    }
  });

  /* ==========================================================================
     7. RSVP FORM & LIVE WISH WALL (SUPABASE)
     ========================================================================== */
  const rsvpForm = document.getElementById('rsvp-form');
  const wishesContainer = document.getElementById('wishes-container');
  const noWishesMsg = document.getElementById('no-wishes');
  const btnSubmitRsvp = document.getElementById('btn-submit-rsvp');

  // Prevent XSS
  const escapeHTML = (str = '') => {
    return str.replace(/[&<>'"]/g,
      tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
      }[tag] || tag)
    );
  };

  const appendWish = (wish, prepend = true) => {
    if (noWishesMsg) noWishesMsg.style.display = 'none';
    const card = document.createElement('div');
    card.className = 'wish-item';
    let badgeClass = 'ragu';
    let badgeLabel = 'Belum Dikonfirmasi';
    if (wish.attendance === 'hadir') { badgeClass = 'hadir'; badgeLabel = 'Hadir'; }
    else if (wish.attendance === 'tidak_hadir') { badgeClass = 'tidak-hadir'; badgeLabel = 'Tidak Hadir'; }
    const date = wish.created_at
      ? new Date(wish.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
      : '';
    card.innerHTML = `
      <div class="wish-header">
        <span class="wish-name">${escapeHTML(wish.guest_name || wish.name)}</span>
        <span class="wish-status ${badgeClass}">${badgeLabel}</span>
      </div>
      <p class="wish-text">&ldquo;${escapeHTML(wish.message || wish.wish)}&rdquo;</p>
      <span class="wish-tamu-qty"><i class="bi bi-clock"></i> ${date}</span>
    `;
    if (prepend) wishesContainer.prepend(card);
    else wishesContainer.appendChild(card);
  };

  const loadWishes = async () => {
    if (typeof supabase === 'undefined') return;
    const { data, error } = await supabase
      .from('rsvp_submissions')
      .select('*')
      .not('message', 'is', null)
      .neq('message', '')
      .order('created_at', { ascending: false })
      .limit(30);
    if (!error && data && data.length > 0) {
      wishesContainer.innerHTML = '';
      if (noWishesMsg) noWishesMsg.style.display = 'none';
      data.forEach(w => appendWish(w, false));
    }
  };
  loadWishes();

  // Realtime: tambah ucapan baru tanpa refresh
  if (typeof supabase !== 'undefined') {
    supabase.channel('live-wishes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rsvp_submissions' }, payload => {
        if (payload.new && payload.new.message) appendWish(payload.new, true);
      })
      .subscribe();
  }

  if (rsvpForm) {
    rsvpForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameVal   = document.getElementById('nama').value.trim();
      const statusVal = document.getElementById('kehadiran').value;
      const paxRaw    = document.getElementById('jumlah-tamu').value;
      const wishVal   = document.getElementById('ucapan').value.trim();

      if (!nameVal || !statusVal || !wishVal) {
        showToast('Mohon lengkapi semua bidang form.');
        return;
      }

      const btnTextEl    = btnSubmitRsvp.querySelector('.btn-text');
      const btnLoadingEl = btnSubmitRsvp.querySelector('.btn-loading-spinner');
      btnSubmitRsvp.disabled = true;
      if (btnTextEl)    btnTextEl.style.display    = 'none';
      if (btnLoadingEl) btnLoadingEl.style.display = 'inline-flex';

      const payload = {
        guest_name: nameVal,
        attendance: statusVal === 'Hadir' ? 'hadir' : (statusVal === 'Tidak Hadir' ? 'tidak_hadir' : null),
        pax: parseInt(paxRaw) || 1,
        message: wishVal,
        linked_guest_id: guestId || null
      };

      try {
        if (typeof supabase !== 'undefined') {
          const { error } = await supabase.from('rsvp_submissions').insert([payload]);
          if (error) throw error;
          if (guestId) {
            await supabase.from('guests').update({ rsvp_status: payload.attendance }).eq('id', guestId);
          }
        } else {
          // Fallback: simpan lokal jika supabase belum tersambung
          appendWish({ ...payload, created_at: new Date().toISOString() }, true);
        }
        showToast('Terima kasih! Ucapan & konfirmasi terkirim 🤍');
        rsvpForm.reset();
      } catch (err) {
        console.error(err);
        showToast('Gagal mengirim. Silakan coba lagi.');
      } finally {
        btnSubmitRsvp.disabled = false;
        if (btnTextEl)    btnTextEl.style.display    = 'inline-flex';
        if (btnLoadingEl) btnLoadingEl.style.display = 'none';
      }
    });
  }

  /* ==========================================================================
     8. DYNAMIC FALLING PETALS EFFECT (ROMANTIC & NATURAL FEEL)
     ========================================================================== */
  const petalsContainer = document.getElementById('petals-container');

  const isMobile = () => window.innerWidth <= 768 || /Mobi|Android/i.test(navigator.userAgent);

  const createPetal = () => {
    const petal = document.createElement('div');
    petal.classList.add('petal');

    // Random properties — simplified for performance
    const size = Math.random() * 12 + 8; // 8px - 20px
    const left = Math.random() * 100;
    const duration = Math.random() * 8 + 7; // 7s - 15s
    const delay = Math.random() * 3;

    petal.style.cssText = [
      `width:${size}px`,
      `height:${size * (Math.random() * 0.35 + 0.75)}px`,
      `left:${left}vw`,
      `animation-duration:${duration}s`,
      `animation-delay:${delay}s`,
    ].join(';');

    // Pastel yellow color variations only
    const colors = [
      'rgba(245, 200, 66, 0.3)',   // pastel yellow
      'rgba(255, 230, 128, 0.28)', // lemon yellow
      'rgba(230, 174, 32, 0.25)',  // amber yellow
      'rgba(255, 248, 180, 0.35)', // pale cream yellow
    ];
    petal.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

    petalsContainer.appendChild(petal);

    // Remove from DOM after animation to prevent memory bloat
    setTimeout(() => {
      petal.remove();
    }, (duration + delay) * 1000);
  };

  const startFallingPetals = () => {
    const initialCount = isMobile() ? 15 : 25;
    const intervalMs  = isMobile() ? 500 : 300;

    // Spawn initial batch
    for (let i = 0; i < initialCount; i++) {
      setTimeout(createPetal, i * 150);
    }

    // Periodically spawn new ones
    petalInterval = setInterval(createPetal, intervalMs);
  };

  /* ==========================================================================
     9. AUTOMATED CAROUSEL SLIDER LOGIC
     ========================================================================== */
  const carousel = document.getElementById('carousel');
  const slides = carousel.querySelectorAll('.carousel-slide');
  const dotsContainer = document.getElementById('carousel-dots-container');
  const dots = dotsContainer.querySelectorAll('.dot');
  
  let currentSlideIndex = 0;
  let carouselTimer = null;
  const SLIDE_DURATION = 4000; // 4 seconds

  const updateSlides = (index) => {
    // Keep index in bounds
    if (index >= slides.length) currentSlideIndex = 0;
    else if (index < 0) currentSlideIndex = slides.length - 1;
    else currentSlideIndex = index;

    // Toggle active classes on slides
    slides.forEach((slide, i) => {
      if (i === currentSlideIndex) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });

    // Toggle active classes on dots
    dots.forEach((dot, i) => {
      if (i === currentSlideIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  };

  const nextSlide = () => {
    updateSlides(currentSlideIndex + 1);
  };

  const prevSlide = () => {
    updateSlides(currentSlideIndex - 1);
  };

  const startCarouselAutoPlay = () => {
    carouselTimer = setInterval(nextSlide, SLIDE_DURATION);
  };

  const resetCarouselAutoPlay = () => {
    clearInterval(carouselTimer);
    startCarouselAutoPlay();
  };

  // Swipe & Drag Support
  let touchStartX = 0;
  let touchEndX = 0;

  const handleSwipe = () => {
    if (touchEndX < touchStartX - 50) {
      nextSlide();
      resetCarouselAutoPlay();
    }
    if (touchEndX > touchStartX + 50) {
      prevSlide();
      resetCarouselAutoPlay();
    }
  };

  carousel.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, {passive: true});

  carousel.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, {passive: true});

  let isDragging = false;
  carousel.addEventListener('mousedown', e => {
    isDragging = true;
    touchStartX = e.screenX;
  });

  carousel.addEventListener('mouseup', e => {
    if (isDragging) {
      touchEndX = e.screenX;
      isDragging = false;
      handleSwipe();
    }
  });

  carousel.addEventListener('mouseleave', e => {
    if (isDragging) {
      touchEndX = e.screenX;
      isDragging = false;
      handleSwipe();
    }
  });

  // Dots click navigation
  dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      const targetIndex = parseInt(e.target.getAttribute('data-index'));
      updateSlides(targetIndex);
      resetCarouselAutoPlay();
    });
  });

  // Start playing automatically
  startCarouselAutoPlay();

  /* ==========================================================================
     10. INTERACTIVE LIGHTBOX MODAL LOGIC
     ========================================================================== */
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
  const lightboxCloseBg = document.getElementById('lightbox-close-bg');
  const polaroidCards = document.querySelectorAll('.polaroid-card');

  const openLightbox = (imgSrc, imgCaption) => {
    lightboxImg.src = imgSrc;
    lightboxCaption.textContent = imgCaption;
    lightboxModal.classList.add('active');
  };

  const closeLightbox = () => {
    lightboxModal.classList.remove('active');
    // Clear src after fade out to avoid flashing wrong image next time
    setTimeout(() => {
      if (!lightboxModal.classList.contains('active')) {
        lightboxImg.src = "";
      }
    }, 400);
  };

  // Bind click handlers to polaroid cards
  polaroidCards.forEach(card => {
    card.addEventListener('click', () => {
      const imgSrc = card.getAttribute('data-img');
      const imgCaption = card.getAttribute('data-caption');
      openLightbox(imgSrc, imgCaption);
    });
  });

  // Bind close handlers
  lightboxCloseBtn.addEventListener('click', closeLightbox);
  lightboxCloseBg.addEventListener('click', closeLightbox);

  // Bind Escape key to close lightbox
  document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
      closeLightbox();
    }
  });

  /* ==========================================================================
     11. STAGGERED SCROLL-REVEAL ANIMATIONS (INTERSECTION OBSERVER)
     ========================================================================== */
  const revealElements = document.querySelectorAll('.scroll-reveal');

  const revealCallback = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Add active class to animate item into view
        entry.target.classList.add('active-reveal');
        // Once revealed, no need to track it anymore
        observer.unobserve(entry.target);
      }
    });
  };

  const revealOptions = {
    root: null, // Viewport
    rootMargin: '0px',
    threshold: 0.15 // Trigger when 15% of the element is visible
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(revealCallback, revealOptions);
    revealElements.forEach(el => observer.observe(el));
  } else {
    // Fallback if browser doesn't support IntersectionObserver
    revealElements.forEach(el => el.classList.add('active-reveal'));
  }

  /* ==========================================================================
     11.5 NAVBAR SCROLL SPY (ACTIVE STATE UPDATE)
     ========================================================================== */
  const navItems = document.querySelectorAll('.nav-item');
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navItems.forEach(item => {
          item.classList.toggle('active', item.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { threshold: 0.4 });

  document.querySelectorAll('section[id]').forEach(section => navObserver.observe(section));

  /* ==========================================================================
     12. LOVE STORY HORIZONTAL CHAPTER SLIDER
     ========================================================================== */
  const lsTrack = document.getElementById('love-story-track');
  const lsCards = lsTrack ? lsTrack.querySelectorAll('.love-story-card') : [];
  const lsSteps = document.querySelectorAll('.stepper-step');
  const lsPrev = document.getElementById('ls-prev');
  const lsNext = document.getElementById('ls-next');
  const stepperLineFills = document.querySelectorAll('.stepper-line-fill');
  let lsCurrentIndex = 0;

  const updateLoveStory = (index) => {
    if (!lsTrack || lsCards.length === 0) return;
    lsCurrentIndex = index;

    // Slide track
    lsTrack.style.transform = `translateX(-${index * 100}%)`;

    // Update card active states
    lsCards.forEach((card, i) => {
      card.classList.toggle('active', i === index);
    });

    // Update stepper active states
    lsSteps.forEach((step, i) => {
      step.classList.toggle('active', i <= index);
    });

    // Update stepper line fills
    stepperLineFills.forEach((fill, i) => {
      fill.style.width = (i < index) ? '100%' : '0%';
    });

    // Update navigation button states
    if (lsPrev) lsPrev.disabled = (index === 0);
    if (lsNext) lsNext.disabled = (index === lsCards.length - 1);
  };

  // Initialize first card as active
  if (lsCards.length > 0) {
    updateLoveStory(0);
  }

  // Stepper click navigation
  lsSteps.forEach(step => {
    step.addEventListener('click', () => {
      const targetIndex = parseInt(step.getAttribute('data-step'));
      updateLoveStory(targetIndex);
    });
  });

  // Prev/Next button navigation
  if (lsPrev) {
    lsPrev.addEventListener('click', () => {
      if (lsCurrentIndex > 0) updateLoveStory(lsCurrentIndex - 1);
    });
  }
  if (lsNext) {
    lsNext.addEventListener('click', () => {
      if (lsCurrentIndex < lsCards.length - 1) updateLoveStory(lsCurrentIndex + 1);
    });
  }

  // Touch swipe support for Love Story Slider
  if (lsTrack) {
    let touchStartX = 0;
    let touchEndX = 0;
    lsTrack.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    lsTrack.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0 && lsCurrentIndex < lsCards.length - 1) updateLoveStory(lsCurrentIndex + 1);
        else if (diff < 0 && lsCurrentIndex > 0) updateLoveStory(lsCurrentIndex - 1);
      }
    }, { passive: true });
  }

  /* ==========================================================================
     13. PAGE VISIBILITY API — PAUSE BACKGROUND ANIMATIONS
     ========================================================================== */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Pause petals
      if (petalInterval) {
        clearInterval(petalInterval);
        petalInterval = null;
      }
      // Pause carousel
      if (carouselTimer) {
        clearInterval(carouselTimer);
        carouselTimer = null;
      }
      // Pause music
      if (isMusicPlaying) {
        bgMusic.pause();
      }
    } else {
      // Resume petals (only if overlay was already opened)
      if (coverOverlay.classList.contains('unlocked') && !petalInterval) {
        petalInterval = setInterval(createPetal, 300);
      }
      // Resume carousel
      if (!carouselTimer) {
        startCarouselAutoPlay();
      }
      // Resume music
      if (isMusicPlaying) {
        bgMusic.play().catch(() => {});
      }
    }
  });


});

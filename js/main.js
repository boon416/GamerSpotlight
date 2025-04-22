/* First Slider One at index.html */
$(".slider-one")
.not(".slick-initialized") // Fix typo: "slick-intialized" -> "slick-initialized"
.slick({
    autoplay: true,
    autoplaySpeed: 3000,
    dots: true,
    fade: true,
    prevArrow: ".site-slider .slider-btn .prev",
    nextArrow: ".site-slider .slider-btn .next",
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          infinite: true,
          dots: true
        }
      },
      {
        breakpoint: 600,
        settings: {
          dots: true,
          prevArrow: false, // ✅ Hide arrows on smaller screens
          nextArrow: false
        }
      },
      {
        breakpoint: 480,
        settings: {
          dots: true,
          prevArrow: false, // ✅ Hide arrows on smaller screens
          nextArrow: false
        }
      }
    ]
});

/*Store Slider */
$(".slider-two")
.not(".slick-initialized") // Fix typo: "slick-intialized" -> "slick-initialized"
.slick({
    autoplay: true,
    prevArrow: ".site-slider-two .prev",
    nextArrow: ".site-slider-two .next",
    slidesToShow: 5,
    slidesToScroll: 1,
    autoplay: 3000,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 3,
          infinite: true,
        }
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 3
        }
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      }
    ]
});




/* Video Hero Slider */
  $('.slider-videos').slick({
      slidesToShow: 1,
      slidesToScroll: 1,
      fade: true,
      asNavFor: '.slider-videos-nav', // Fixed class name,
      arrows: false,
  });

  $('.slider-videos-nav').slick({
      slidesToShow: 3,
      slidesToScroll: 1,
      asNavFor: '.slider-videos', // Fixed class name
      centerMode: true,
      focusOnSelect: true,
      prevArrow:".SliderHeroVideos .video-slider-btn .prev",
      nextArrow:".SliderHeroVideos .video-slider-btn .next"
  });

/* Title Slider */
  $(document).ready(function () {
    $(".title-video").each(function (index, element) {
      // Create unique selectors for prev/next buttons
      const prevArrow = $(this).prev(".title-container").find(".prev");
      const nextArrow = $(this).prev(".title-container").find(".next");
  
      $(element).slick({
        infinite: false,
        speed: 300,
        prevArrow: prevArrow,
        nextArrow: nextArrow,
        slidesToShow: 5,
        slidesToScroll: 5,
        responsive: [
          {
            breakpoint: 1024,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 3,
              infinite: true,
              dots: true
            }
          },
          {
            breakpoint: 600,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 3
            }
          },
          {
            breakpoint: 480,
            settings: {
              slidesToShow: 1,
              slidesToScroll: 1
            }
          }
        ]
      });
    });
  });
  
  import { UserManager } from 'https://cdn.skypack.dev/oidc-client-ts';

const cognitoAuthConfig = {
  authority: "https://ap-southeast-1ypgkwwghv.auth.ap-southeast-1.amazoncognito.com",
  client_id: "p36ba0bp3u8sqr55fc682n714",
  redirect_uri: "https://staging.d3744hmwully3z.amplifyapp.com/index.html",
  response_type: "code",
  scope: "openid email profile"
};

export const userManager = new UserManager({ ...cognitoAuthConfig });

export async function signOutRedirect () {
  const logoutUri = cognitoAuthConfig.redirect_uri;
  const cognitoDomain = cognitoAuthConfig.authority;
  window.location.href = `${cognitoDomain}/logout?client_id=${cognitoAuthConfig.client_id}&logout_uri=${encodeURIComponent(logoutUri)}`;
}

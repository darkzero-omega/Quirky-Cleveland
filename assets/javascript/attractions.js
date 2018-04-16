//$( document ).ready(function() {
    //console.log( "ready!" );

var searchResults = document.getElementById("search-results");
    searchResults.style.display = "none";

    //The following 3 blocks of code are JQuery functions used to search lists of preloaded and user added attractions as well as search results 
    $("#searchResultsInput").on("keyup", function () {
      var value = $(this).val().toLowerCase();
      $("#places tr").filter(function () {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
      });
    });

    $("#searchpreloaded").on("keyup", function () {
      var value = $(this).val().toLowerCase();
      $("#preloaded-list tr").filter(function () {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
      });
    });

    $("#search-user-added").on("keyup", function () {
      var value = $(this).val().toLowerCase();
      $("#user-added-list tr").filter(function () {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
      });
    });

    //This code configures the Firebase database used to hold preloaded and user added location data
    var config = {
      apiKey: "AIzaSyBNvq6AmEOQst9c2aSTD6sFlQ0MmHmX2j0",
      authDomain: "new-project-97d65.firebaseapp.com",
      databaseURL: "https://new-project-97d65.firebaseio.com",
      projectId: "new-project-97d65",
      storageBucket: "new-project-97d65.appspot.com",
      messagingSenderId: "151445565306"
    };

    firebase.initializeApp(config);

    var database = firebase.database();

    var preLoadedAttractions = [];

    var map;
    var searchEntry;

    var showPreLoaded;
    var preLoadedMarkers = [];

    var showSearchResults;
    var searchMarkers = [];

    var newAttractionsMarkers = [];
    var showUserAdded;

    var geocodingAddress;
    var geocodingPosition;
    var geocodingName;

    var placeInfo = "No information found";

    //Function to pull Wikipedia extract searching by latitude, longitude and place name
    function getExtract(lat, lng, name) {
      var pageID;

      $.ajax({
        type: "GET",
        url: "https://en.wikipedia.org/w/api.php?origin=*&action=query&list=geosearch&gsradius=10000&gscoord=" + lat + "|" + lng + "&format=json&gslimit=1",
        success: function (data, textStatus, jqXHR) {
            
            pageID = data.query.geosearch[0].pageid;

            //console.log(pageID)

            var queryURL = "https://en.wikipedia.org/w/api.php?&origin=*&format=json&action=query&redirects=1&generator=geosearch&prop=extracts|coordinates|pageimages&ggslimit=1&ggsradius=1000&ggscoord=" + lat + "|" + lng + "&exintro=1&explaintext=1&exlimit=1&coprop=type|dim|globe&colimit=1&piprop=thumbnail&pithumbsize=400&pilimit=1";

              $.ajax({
                url: queryURL,
                method: 'GET',
            }).then(function(response) {
                 var extract = response.query.pages["" + pageID + ""].extract;
                 if (extract.includes(name)) {
                  placeInfo = extract;
                  var placeInfoTD = document.getElementById("" + name + "");
                  placeInfoTD.textContent = placeInfo;
                 } else {
                  //console.log("No information found");
                  placeInfo = "No information found";
                  var placeInfoTD = document.getElementById("" + name + "");
                  placeInfoTD.textContent = placeInfo;
                 }
                 
            });
     
            },
            error: function (errorMessage) {
            }
        });

        }

    //All functions using the Google Maps API must be used inside the initMap function specified as the callback function in the API url link
    function initMap() {

      //This Code deals with setting, showing, and hiding preloaded data from Firebase as well as configuring the google map around the desired location
      database.ref("preloaded/preloaded-attractions").once('value').then(function (snapshot) {

        preLoadedAttractions = snapshot.val();

        var options = {
          zoom: 11,
          center: {
            lat: 41.4993,
            lng: -81.6944
          }
        }

        map = new google.maps.Map(document.getElementById("map"), options)

        var bounds = new google.maps.LatLngBounds({
          lat: 41.359552,
          lng: -81.965657
        }, {
          lat: 41.615186,
          lng: -81.398746
        });
        map.fitBounds(bounds);

        function setPreLoadedAttractions() {
          showPreLoaded = true;

          for (i = 0; i < preLoadedAttractions.length; i++) {
            var marker = new google.maps.Marker({
              position: preLoadedAttractions[i].position,
              map: map,
              icon: "assets/map icons/map-marker-icon.png"
            });

            marker.content = "<div class='infoWindow'><strong>" + preLoadedAttractions[i].name + "</strong>" + "<br> " +
              preLoadedAttractions[i].address + "</div>";

            var infoWindow = new google.maps.InfoWindow();
            google.maps.event.addListener(marker, "click", function () {
              infoWindow.setContent(this.content);
              infoWindow.open(this.getMap(), this);
            });

            preLoadedMarkers.push(marker);
          }
        }

        //Calling the function here ensures preloaded attractions are set when page loads
        setPreLoadedAttractions();

        //A click even to the "Show/Hide" button to show/hide map icons
        togglepreloaded.onclick = function (event) {
          if (showPreLoaded === true) {
            removePreLoadedMarkers();
            showPreLoaded = false;
            return;
          }
          if (showPreLoaded === false) {
            setPreLoadedAttractions();
            showPreLoaded = true;
            return;
          }

        }

        //Removes preloaded markers by setting them to null. Preloaded locations are put into an array when set; this function loops through that array and then empties the array
        function removePreLoadedMarkers() {
          for (i = 0; i < preLoadedMarkers.length; i++) {
            preLoadedMarkers[i].setMap(null);
          }
          preLoadedMarkers = [];
        }

      });

      //This code deals with searching the map using the places
      search.onclick = function (event) {
        removeSearchResults();
        searchEntry = document.getElementById("autocomplete").value
        document.getElementById("autocomplete").value = "";

        //Sets the bounds into which the search is biased
        var bounds = new google.maps.LatLngBounds({
          lat: 41.359552,
          lng: -81.965657
        }, {
          lat: 41.615186,
          lng: -81.398746
        });
        map.fitBounds(bounds);

        var request = {
          bounds: bounds,
          query: searchEntry
        }

        var service = new google.maps.places.PlacesService(map);
        service.textSearch(request, callback);

        //Sets returned locations on the map
        function callback(results, status) {
          if (status == google.maps.places.PlacesServiceStatus.OK) {
            for (var i = 0; i < results.length; i++) {
              var place = results[i];
              //console.log(place);
              createList(results[i]);
              var marker = new google.maps.Marker({
                position: place.geometry.location,
                map: map,
                icon: "assets/map icons/map-marker-icon-pink.png"
              })

              marker.content = "<div class='infoWindow'><strong>" + place.name + "</strong>" + "<br> " + place.formatted_address + "</div>";

              var infoWindow = new google.maps.InfoWindow();
              google.maps.event.addListener(marker, "click", function () {
                infoWindow.setContent(this.content);
                infoWindow.open(this.getMap(), this);
              });

              searchMarkers.push(marker);
            }
          }
        }

        //Creates a list of returned results in the HTML
        function createList(place) {
          searchResults.style.display = "block";

          var placesList = document.getElementById("places")

          var newRow = document.createElement('tr');
          placesList.appendChild(newRow);

          var nameTD = document.createElement('td');
          newRow.appendChild(nameTD);
          nameTD.textContent = place.name;

          var addressTD = document.createElement('td');
          newRow.appendChild(addressTD);
          addressTD.textContent = place.formatted_address;

           var infoTD = document.createElement('td');
           infoTD.setAttribute("id", "" + place.name + "")
           newRow.appendChild(infoTD);
           infoTD.textContent = "No information found";

           getExtract(place.geometry.location.lat(), place.geometry.location.lng(), place.name)
          }
      }

      togglesearchresults.onclick = function (event) {
        removeSearchResults();
      }

      //Function to clear search results. Removing the icons from the map works in the same way as hiding preloaded attractions.
      function removeSearchResults() {
        for (i = 0; i < searchMarkers.length; i++) {
          searchMarkers[i].setMap(null);
        }
        searchMarkers = [];
        var placesList = document.getElementById("places")
        placesList.innerHTML = "";
        document.getElementById("searchResultsInput").value = "";
        searchResults.style.display = "none";
      }

      //This function pulls user added attractions from the database and loops through them to set them on the map
      function setAddedAttractions() {
        showUserAdded = true;

        database.ref("/user added attractions").once('value').then(function (snapshot) {
          snapshot.forEach(function (place) {

            var marker = new google.maps.Marker({
              position: place.val().position,
              map: map,
              icon: "assets/map icons/map-marker-icon-green.png"
            })

            marker.content = "<div class='infoWindow'><strong>" + place.val().name + "</strong>" + "<br> " + place.val().address + "</div>";

            var infoWindow = new google.maps.InfoWindow();
            google.maps.event.addListener(marker, "click", function () {
              infoWindow.setContent(this.content);
              infoWindow.open(this.getMap(), this);
            });

            newAttractionsMarkers.push(marker);
          })
        });
      }

      //Calling the function here ensures database user added attractions are set when page loads
      setAddedAttractions();

      //This function removes attractions from the map 
      function removeNewAttractionsMarkers() {
        for (i = 0; i < newAttractionsMarkers.length; i++) {
          newAttractionsMarkers[i].setMap(null);
        }
        newAttractionsMarkers = [];
      }

      //This click event shows/hids user added locations on the map by calling the corresponding functions
      toggleuseradded.onclick = function (event) {
        if (showUserAdded === true) {
          removeNewAttractionsMarkers();
          showUserAdded = false;
        } else if (showUserAdded === false) {
          setAddedAttractions();
        }

      }

      //This click event uses the Google Places API to add a new location to the user added branch of the database
      geocoding.onclick = function (event) {
        var address = document.getElementById("geocodinginput").value;

        document.getElementById("geocoding-response").innerHTML = "";

        $.ajax({
          url: "https://maps.googleapis.com/maps/api/geocode/json?address=" + address +
            "&key=AIzaSyB00HoG_XIHLQirqHUmhGSR1aBdnDjjCms",
          method: "GET"
        }).then(function (response) {
          console.log(response.status)
          if (response.status === "ZERO_RESULTS") {
            var geocodingResponse = document.getElementById("geocoding-response");
            var addressDiv = document.createElement('div');
            geocodingResponse.appendChild(addressDiv);

            addressDiv.innerHTML = "<strong>Please enter a valid address.</strong>"
          } else {
            var geocodingResponse = document.getElementById("geocoding-response");
            var addressDiv = document.createElement('div');
            geocodingResponse.appendChild(addressDiv);

            addressDiv.innerHTML = "<p>Is this the address you were looking for?</p>" +
              "<p><strong>" + response.results[0].formatted_address + "</strong></p>" +
              "<p>If yes, enter the name of the location and click submit to add it to the map.</p><input id='locationname'><button id='submit'>Submit</button><button id='clearaddress'>Clear result</button>"

            geocodingAddress = response.results[0].formatted_address;
            geocodingPosition = response.results[0].geometry.location;
          }
        });
      }

      //Collects user added info and sends it to the database, then calls the function to add it to the map
      $(document).on("click", "#submit", function () {
        geocodingName = document.getElementById("locationname").value;

        database.ref("/user added attractions").push({
          position: geocodingPosition,
          name: geocodingName,
          address: geocodingAddress
        })

        document.getElementById("geocoding-response").innerHTML = "";
        document.getElementById("geocodinginput").value = "";

        setAddedAttractions();
      });

      $(document).on("click", "#clearaddress", function () {
        document.getElementById("geocoding-response").innerHTML = "";
        document.getElementById("geocodinginput").value = "";
      })

      //This code listens to the user added locations in the database, and updates the map and user added list when there are any changes
      database.ref("/user added attractions").on("child_added", function (snapshot) {
        createUserAddedList();
        setAddedAttractions();
      });
    }

    //The following 2 functions create lists of the preloaded and user added attractions in database, including name, address, and additional information
    function createPreloadedList() {
      database.ref("/preloaded/preloaded-attractions").once('value').then(function (snapshot) {

        for (i = 0; i < snapshot.val().length; i++) {
          var name = snapshot.val()[i].name;
          var address = snapshot.val()[i].address;
          var info = "No information found";

          var preloadedList = document.getElementById("preloaded-list");
          var newRow = document.createElement('tr');
          preloadedList.appendChild(newRow);

          var nameTD = document.createElement('td');
          newRow.appendChild(nameTD);
          nameTD.textContent = name;

          var addressTD = document.createElement('td');
          newRow.appendChild(addressTD);
          addressTD.textContent = address;

          var infoTD = document.createElement('td');
          infoTD.setAttribute("id","" + name + "")
          newRow.appendChild(infoTD);
          infoTD.textContent = info;

          getExtract(snapshot.val()[i].position.lat, snapshot.val()[i].position.lng, snapshot.val()[i].name);
        }
      })
    }

    //Creates preloaded list on page load
    createPreloadedList();

    function createUserAddedList() {

      database.ref("/user added attractions").once('value').then(function (snapshot) {
        document.getElementById("user-added-list").innerHTML = "";

        snapshot.forEach(function (place) {

          var name = place.val().name;
          var address = place.val().address;
          var info = placeInfo;


          var userAddedList = document.getElementById("user-added-list");
          var newRow = document.createElement('tr');
          userAddedList.appendChild(newRow);

          var nameTD = document.createElement('td');
          newRow.appendChild(nameTD);
          nameTD.textContent = name;

          var addressTD = document.createElement('td');
          newRow.appendChild(addressTD);
          addressTD.textContent = address;

          var infoTD = document.createElement('td');
          infoTD.setAttribute("id", "" + name + "")
          newRow.appendChild(infoTD);
          infoTD.textContent = info; 

          getExtract(place.val().position.lat, place.val().position.lng, place.val().name)
        });
      })
    }

    
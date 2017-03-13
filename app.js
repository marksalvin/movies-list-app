/**
 * Manage the applications state
 */
const createStore = (reducers = {}, effects = {}, initialState = {}) => {
  let state = initialState;
  let subscribers = [];

  const getState = () => state;

  const subscribe = subscriber => {
    subscribers.push(subscriber);
  };

  const dispatch = action => {
    const { type } = action;

    if (!reducers[type]) return;

    state = reducers[type](state, action, { dispatch, dispatchEffect });

    subscribers.forEach(subscriber => subscriber(state, { dispatch, dispatchEffect }));
  };

  const dispatchEffect = action => {
    const { type } = action;

    if (!effects[type]) return;

    effects[type](state, action, { dispatch, dispatchEffect });
  };

  return {
    getState,
    subscribe,
    dispatch,
    dispatchEffect,
  };
};

/**
 * Helpers
 */
const buildMovieObject = movie => ({
  title: movie.title,
  thumbnail: `https://image.tmdb.org/t/p/w92/${movie.poster_path}`,
  rating: movie.vote_average,
  description: movie.overview,
  showDescription: false,
});

/**
 * The applications state change pipeline
 */
const FETCH_MOVIES_REQUEST = 'FETCH_MOVIES_REQUEST';
const FETCH_MOVIES_SUCCESS = 'FETCH_MOVIES_SUCCESS';
const FETCH_MOVIES_FAILURE = 'FETCH_MOVIES_FAILURE';
const SHOW_MOVIE_DESCRIPTION = 'SHOW_MOVIES_DESCRIPTION';

const fetchMoviesRequest = state =>
  Object.assign({}, state, { isFetchingItems: true, error: undefined });

const fetchMoviesRequestEffect = (state, action, { dispatch }) => action.query &&
  fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=en-UK&query=${action.query}&page=1&include_adult=false`)
    .then(response => {
      if (!response.ok) {
        return Promise.reject(response.statusText);
      }
      return response;
    })
    .then(response => response.json())
    .then(response =>
      dispatch({
        type: FETCH_MOVIES_SUCCESS,
        // Undefined results will be caught below
        data: response.results.map((movie, index) => buildMovieObject(movie)),
      }))
    .catch(error =>
      dispatch({
        type: FETCH_MOVIES_FAILURE,
        error: `${error}` || 'Unknown error',
      }));

const fetchMoviesSuccess = (state, action) =>
  Object.assign({}, state, { items: action.data, isFetchingItems: false });

const fetchMoviesFailure = (state, action) =>
  Object.assign(
    {},
    state,
    { items: undefined, isFetchingItems: false, error: action.error }
  );

const showMovieDescription = (state, action) => {
  let items;

  if (state.items && state.items.length && state.items.length > 0) {
    items = state.items.map((item, index) => {
      if (index === action.index) {
        return Object.assign({}, item, { showDescription: true });
      }
      
      return Object.assign({}, item, { showDescription: false });
    });
  }

  return Object.assign({}, state, { items });
}

const reducers = {
  [FETCH_MOVIES_REQUEST]: fetchMoviesRequest,
  [FETCH_MOVIES_SUCCESS]: fetchMoviesSuccess,
  [FETCH_MOVIES_FAILURE]: fetchMoviesFailure,
  [SHOW_MOVIE_DESCRIPTION]: showMovieDescription,
};

const effects = {
  [FETCH_MOVIES_REQUEST]: fetchMoviesRequestEffect,
};

/**
 * Manage the applications view
 */
const renderMoviesList = (state, { dispatch, dispatchEffect }) => {
  let listHTML = '';
  if (state.isFetchingItems) {
    listHTML = '<p class="results__loading">Loading...</p>';
  } else if (state.items && state.items.length && state.items.length > 0) {
    listHTML = `
      <h1>Results</h1>
      <table>
        <thead>
          <th>Image</th>
          <th>Title</th>
          <th>Rating</th>
          <th></th>
        </thead>
        <tbody>
          ${state.items.map((item, index) => `
            <tr>
              <td>
                <img
                  src="${item.thumbnail}"
                  alt="${item.title}"
                  width="92"
                  height="92"
                />
              </td>
              <td>${item.title}</td>
              <td>${item.rating}</td>
              <td>
                <button class="results__read-more" data-key="${index}">Read more</button>
              </td>
            </tr>
            ${item.showDescription ? `
              <tr>
                <td colspan="4">${item.description}</td>
              </tr>
            ` : ''}
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (state.error) {
    listHTML = `
      <h1>There was an error</h1>
      <p>Details: ${state.error}.</p>
    `;
  } else if (!state.isFetchingItems) {
    listHTML = `
      <h1>There were no results</h1>
      <p>Please try another movie name.</p>
    `;
  }

  document.getElementById('results').innerHTML = listHTML;

  document.querySelectorAll('.results__read-more').forEach((item, index) => {
    item.addEventListener(
      'click',
      () => {
        dispatch({ type: SHOW_MOVIE_DESCRIPTION, index })
      },
      false
    );
  });
};

const renderApp = (root, { dispatch, dispatchEffect }) => {
  const appHTML = `
    <div class="header">
      <div class="header__title">
        The Movie DB
      </div>
    </div>
    <div class="main">
      <div class="search">
        <input type="text" id="search__query" class="search__query" />
        <button id="search__search" class="search__query">Search</button>
      </div>
      <span id="results" class="results"></span>
    </div>
  `;

  document.getElementById(root).innerHTML = appHTML;

  document.getElementById('search__search').addEventListener(
    'click',
    () => {
      // Reducer used to clear errors, effect used for network request
      dispatch({
        type: FETCH_MOVIES_REQUEST,
      });
      dispatchEffect({
        type: FETCH_MOVIES_REQUEST,
        query: document.getElementById('search__query').value,
      });
    },
    false
  );
};

/**
 * Bootstrap the application
 */
const store = createStore(reducers, effects);
store.subscribe(renderMoviesList);
renderApp(
  'app',
  { dispatch: store.dispatch, dispatchEffect: store.dispatchEffect }
);

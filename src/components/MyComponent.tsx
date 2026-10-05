import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoffee, faUser } from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

const MyComponent: React.FC = () => {
  return (
    <div>
      <h3>Contoh Ikon Font Awesome:</h3>
      {/* Ikon Solid */}
      <FontAwesomeIcon icon={faCoffee} />
      <FontAwesomeIcon icon={faUser} color="blue" />
      
      {/* Ikon Brand */}
      <FontAwesomeIcon icon={faGithub} size="2x" />
    </div>
  );
};

export default MyComponent;
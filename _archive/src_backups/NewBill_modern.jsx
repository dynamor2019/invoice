import { useEffect, useState } from 'react'
import { getApiBase, getApiHost } from '../store/api'
import { createBill } from '../store/bills'
import { getReasons, findDefaultSelection } from '../store/reasons'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../store/users'
impo